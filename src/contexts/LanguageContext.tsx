import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { translations } from '../lib/i18n.ts'
import { supabase } from '../lib/supabase.ts'
import { readPreference, savePreference } from '../lib/storage.ts'

const LanguageContext = createContext<any>(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => readPreference('lang', 'ru', ['ru', 'tj', 'en']))

  useEffect(() => {
    document.documentElement.lang = lang === 'tj' ? 'tg' : lang
  }, [lang])

  // Правки из админки: { 'hero.title.ru': '...', 'price_home_visit': '70' }
  const [overrides, setOverrides] = useState({})
  const [settings, setSettings] = useState({})

  const loadContent = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        supabase.from('site_content').select('key, value'),
        supabase.from('site_settings').select('key, value'),
      ])
      const toObj = (rows) => {
        const o = {}
        ;(rows || []).forEach((r) => {
          if (r?.value != null && String(r.value).trim() !== '') o[r.key] = String(r.value)
        })
        return o
      }
      // supabase-js не бросает исключение, а возвращает { error }
      if (c?.error && s?.error) return false
      setOverrides(toObj(c?.data))
      setSettings(toObj(s?.data))
      return true
    } catch {
      /* остаёмся на встроенных переводах */
      return false
    }
  }, [])

  useEffect(() => {
    // Первый запрос иногда не проходит (холодный старт, слабая сеть).
    // Тогда пробуем ещё раз через 2 секунды, чтобы правки из админки
    // всё-таки подтянулись.
    let timer = null
    loadContent().then(ok => {
      if (!ok) timer = setTimeout(() => loadContent(), 2000)
    })
    return () => { if (timer) clearTimeout(timer) }
  }, [loadContent])

  const changeLang = useCallback((newLang) => {
    if (!['ru', 'tj', 'en'].includes(newLang)) return
    setLang(newLang)
    savePreference('lang', newLang)
    document.documentElement.lang = newLang === 'tj' ? 'tg' : newLang
  }, [])

  // Приоритет: БД(с языком) → БД(общее) → i18n(текущий язык) → i18n(ru) → ключ
  const t = useCallback((key) => {
    const localized = overrides[`${key}.${lang}`]
    if (localized) return localized
    const plain = overrides[key]
    if (plain) return plain
    return translations[lang]?.[key] || translations.ru?.[key] || key
  }, [lang, overrides])

  // Настройки контактов (телефон, адрес, соцсети) из админки
  const s = useCallback((key, fallback = '') => settings[key] || fallback, [settings])

  return (
    <LanguageContext.Provider
      value={{ lang, changeLang, t, s, settings, overrides, reloadContent: loadContent }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext) as any
