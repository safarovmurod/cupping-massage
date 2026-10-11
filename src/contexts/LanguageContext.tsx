import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { BrandLanguage } from '../lib/brand.ts'
import { readPreference, savePreference } from '../lib/storage.ts'

type LanguageState = { lang: BrandLanguage; changeLang: (value: string) => void }
const LanguageContext = createContext<LanguageState | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<BrandLanguage>(() => readPreference('lang', 'ru', ['ru', 'tj', 'en']) as BrandLanguage)
  useEffect(() => { document.documentElement.lang = lang === 'tj' ? 'tg' : lang }, [lang])
  function changeLang(value: string) {
    if (value !== 'ru' && value !== 'tj' && value !== 'en') return
    setLang(value)
    savePreference('lang', value)
  }
  return <LanguageContext.Provider value={{ lang, changeLang }}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is required')
  return context
}
