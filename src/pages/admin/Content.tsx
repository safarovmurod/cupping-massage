import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import MuiButton from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RestoreIcon from '@mui/icons-material/Restore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { supabase } from '../../lib/supabase.ts'
import { translations } from '../../lib/i18n.ts'
import { useLang } from '../../contexts/LanguageContext.tsx'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(212,168,87,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#d4a857' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#d4a857' },
}

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tj', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

/**
 * Каждое поле знает, ГДЕ на сайте оно показывается (where)
 * и на какую секцию ведёт ссылка (anchor).
 */
const SECTIONS = [
  {
    id: 'hero',
    title: 'Главный экран (Hero)',
    where: 'Самый верх главной страницы — первое, что видит клиент',
    anchor: '/#home',
    fields: [
      { key: 'hero.title',        label: 'Заголовок',        multiline: true },
      { key: 'hero.subtitle',     label: 'Подзаголовок',     multiline: true },
      { key: 'hero.badge',        label: 'Плашка-предупреждение' },
      { key: 'hero.card1.title',  label: 'Карточка 1 — название' },
      { key: 'hero.card1.price',  label: 'Карточка 1 — цена' },
      { key: 'hero.card1.desc',   label: 'Карточка 1 — описание', multiline: true },
      { key: 'hero.card2.title',  label: 'Карточка 2 — название' },
      { key: 'hero.card2.desc',   label: 'Карточка 2 — описание', multiline: true },
      { key: 'hero.btn.whatsapp', label: 'Кнопка WhatsApp' },
      { key: 'hero.btn.more',     label: 'Кнопка «Подробнее»' },
    ],
  },
  {
    id: 'pricing',
    title: 'Цены и запись',
    where: 'Блок «Цены» на главной странице',
    anchor: '/#pricing',
    fields: [
      { key: 'pricing.title',        label: 'Заголовок блока' },
      { key: 'pricing.subtitle',     label: 'Подзаголовок' },
      { key: 'pricing.card1.title',  label: 'Тариф 1 — название' },
      { key: 'pricing.card1.price',  label: 'Тариф 1 — ЦЕНА' },
      { key: 'pricing.card1.f1',     label: 'Тариф 1 — пункт 1' },
      { key: 'pricing.card1.f2',     label: 'Тариф 1 — пункт 2' },
      { key: 'pricing.card1.f3',     label: 'Тариф 1 — пункт 3' },
      { key: 'pricing.card1.btn',    label: 'Тариф 1 — кнопка' },
      { key: 'pricing.card2.title',  label: 'Тариф 2 — название' },
      { key: 'pricing.card2.price',  label: 'Тариф 2 — ЦЕНА' },
      { key: 'pricing.card2.f1',     label: 'Тариф 2 — пункт 1' },
      { key: 'pricing.card2.f2',     label: 'Тариф 2 — пункт 2' },
      { key: 'pricing.card2.f3',     label: 'Тариф 2 — пункт 3' },
      { key: 'pricing.card2.btn',    label: 'Тариф 2 — кнопка' },
      { key: 'pricing.note',         label: 'Примечание под тарифами', multiline: true },
      { key: 'pricing.badge.popular',label: 'Плашка «Популярный выбор»' },
    ],
  },
  {
    id: 'benefits',
    title: 'Преимущества',
    where: 'Блок «Польза баночного массажа»',
    anchor: '/#benefits',
    fields: [
      { key: 'benefits.title',    label: 'Заголовок блока' },
      { key: 'benefits.subtitle', label: 'Подзаголовок' },
      ...Array.from({ length: 6 }, (_, i) => ([
        { key: `benefit.${i + 1}.title`, label: `Преимущество ${i + 1} — название` },
        { key: `benefit.${i + 1}.desc`,  label: `Преимущество ${i + 1} — описание`, multiline: true },
      ])).flat(),
    ],
  },
  {
    id: 'steps',
    title: 'Как проходит массаж',
    where: 'Блок с 4 этапами процедуры',
    anchor: '/#process',
    fields: [
      { key: 'steps.title',    label: 'Заголовок блока' },
      { key: 'steps.subtitle', label: 'Подзаголовок' },
      ...Array.from({ length: 4 }, (_, i) => ([
        { key: `step.${i + 1}.title`, label: `Этап ${i + 1} — название` },
        { key: `step.${i + 1}.desc`,  label: `Этап ${i + 1} — описание`, multiline: true },
      ])).flat(),
    ],
  },
  {
    id: 'whatis',
    title: 'Что такое баночный массаж',
    where: 'Информационный блок на главной',
    anchor: '/#whatis',
    fields: [
      { key: 'whatis.title', label: 'Заголовок' },
      { key: 'whatis.p1',    label: 'Абзац 1', multiline: true },
      { key: 'whatis.p2',    label: 'Абзац 2', multiline: true },
    ],
  },
  {
    id: 'contra',
    title: 'Противопоказания',
    where: 'Блок с предупреждениями',
    anchor: '/#contra',
    fields: [
      { key: 'contra.title',    label: 'Заголовок' },
      { key: 'contra.subtitle', label: 'Подзаголовок' },
      { key: 'contra.header',   label: 'Вступление', multiline: true },
      ...Array.from({ length: 7 }, (_, i) => (
        { key: `contra.${i + 1}`, label: `Пункт ${i + 1}` }
      )),
      { key: 'contra.warning',  label: 'Предупреждение', multiline: true },
      { key: 'contra.children', label: 'О детях', multiline: true },
    ],
  },
  {
    id: 'footer',
    title: 'Подвал сайта (Footer)',
    where: 'Самый низ ВСЕХ страниц сайта',
    anchor: '/#footer',
    fields: [
      { key: 'footer.about',          label: 'Описание компании', multiline: true },
      { key: 'footer.note',           label: 'Примечание (золотым)' },
      { key: 'footer.links.title',    label: 'Заголовок «Ссылки»' },
      { key: 'footer.contacts.title', label: 'Заголовок «Контакты»' },
    ],
  },
  {
    id: 'nav',
    title: 'Меню навигации',
    where: 'Верхнее меню и мобильное меню',
    anchor: '/',
    fields: [
      { key: 'nav.home',     label: 'Главная' },
      { key: 'nav.benefits', label: 'Преимущества' },
      { key: 'nav.process',  label: 'Как проходит' },
      { key: 'nav.prices',   label: 'Цены' },
      { key: 'nav.contacts', label: 'Контакты' },
    ],
  },
]

export default function AdminContent() {
  const { reloadContent } = useLang()
  const [activeLang, setActiveLang] = useState('ru')
  const [values, setValues] = useState({})     // { 'hero.title.ru': '...' }
  const [initial, setInitial] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchContent() }, [])

  async function fetchContent() {
    setLoading(true)
    try {
      const { data } = await supabase.from('site_content').select('key, value')
      const obj = {}
      ;(data || []).forEach((r) => { obj[r.key] = r.value ?? '' })
      setValues(obj)
      setInitial(obj)
    } catch {
      setToast({ type: 'error', msg: 'Не удалось загрузить контент' })
    } finally {
      setLoading(false)
    }
  }

  const dbKey = (key) => `${key}.${activeLang}`

  // Текст по умолчанию из i18n — показываем как placeholder
  const defaultText = (key) =>
    translations[activeLang]?.[key] || translations.ru?.[key] || ''

  const getValue = (key) => values[dbKey(key)] ?? ''

  const setValue = (key, val) =>
    setValues((prev) => ({ ...prev, [dbKey(key)]: val }))

  const resetField = (key) =>
    setValues((prev) => ({ ...prev, [dbKey(key)]: '' }))

  // Список изменённых полей
  const changedKeys = useMemo(
    () => Object.keys(values).filter((k) => (values[k] ?? '') !== (initial[k] ?? '')),
    [values, initial]
  )

  async function saveAll() {
    if (changedKeys.length === 0) {
      setToast({ type: 'info', msg: 'Нет изменений для сохранения' })
      return
    }
    setSaving(true)
    try {
      const rows = changedKeys.map((k) => ({
        key: k,
        value: values[k] ?? '',
        updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
      if (error) throw error

      setInitial({ ...values })
      await reloadContent?.()
      setToast({
        type: 'success',
        msg: `Сохранено полей: ${rows.length}. Изменения уже на сайте — обновите страницу сайта.`,
      })
    } catch (e) {
      setToast({ type: 'error', msg: `Ошибка сохранения: ${e.message || e}` })
    } finally {
      setSaving(false)
    }
  }

  // Фильтр по поиску
  const filteredSections = useMemo(() => {
    if (!search.trim()) return SECTIONS
    const q = search.toLowerCase()
    return SECTIONS
      .map((s) => ({
        ...s,
        fields: s.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.key.toLowerCase().includes(q) ||
            defaultText(f.key).toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.fields.length > 0)
  }, [search, activeLang])

  if (loading) {
    return <Typography sx={{ textAlign: 'center', py: 6, color: '#8a7f76' }}>Загрузка контента…</Typography>
  }

  const changedInLang = changedKeys.filter((k) => k.endsWith(`.${activeLang}`)).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Инструкция */}
      <Alert severity="info" sx={{ mb: 2.5 }}>
        <b>Как это работает:</b> выберите язык, найдите нужный блок, впишите новый текст → «Сохранить».
        Пустое поле = используется текст по умолчанию (показан серым внутри поля).
        Под каждым блоком написано, <b>где именно на сайте</b> он отображается.
      </Alert>

      {/* Переключатель языка */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography sx={{ fontSize: '0.85rem', color: '#8a7f76', mb: 1 }}>
            Язык, который редактируем:
          </Typography>
          <Tabs
            value={activeLang}
            onChange={(_, v) => setActiveLang(v)}
            sx={{
              '& .MuiTab-root': { color: '#8a7f76', fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' },
              '& .Mui-selected': { color: '#d4a857 !important' },
              '& .MuiTabs-indicator': { background: '#d4a857', height: 3, borderRadius: 2 },
            }}
          >
            {LANGS.map((l) => {
              const cnt = changedKeys.filter((k) => k.endsWith(`.${l.code}`)).length
              return (
                <Tab
                  key={l.code}
                  value={l.code}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <span style={{ fontSize: '1.15rem' }}>{l.flag}</span>
                      {l.label}
                      {cnt > 0 && (
                        <Chip label={cnt} size="small"
                          sx={{ height: 18, fontSize: '0.7rem', background: '#e8915a', color: '#fff' }} />
                      )}
                    </Box>
                  }
                />
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Поиск */}
      <TextField
        placeholder="Поиск по названию поля или тексту…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ ...inputSx, mb: 2.5, width: '100%', maxWidth: 480 }}
        size="small"
      />

      {/* Блоки */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredSections.map((section) => {
          const sectionChanged = section.fields.filter(
            (f) => (values[dbKey(f.key)] ?? '') !== (initial[dbKey(f.key)] ?? '')
          ).length

          return (
            <Accordion
              key={section.id}
              defaultExpanded={section.id === 'hero' || !!search}
              sx={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(212,168,87,0.15)',
                borderRadius: '14px !important',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#d4a857' }} />}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700, color: '#f5ede4' }}>{section.title}</Typography>
                    <Chip label={`${section.fields.length} полей`} size="small"
                      sx={{ height: 20, fontSize: '0.7rem', background: 'rgba(212,168,87,0.15)', color: '#d4a857' }} />
                    {sectionChanged > 0 && (
                      <Chip label={`изменено: ${sectionChanged}`} size="small"
                        sx={{ height: 20, fontSize: '0.7rem', background: '#e8915a', color: '#fff' }} />
                    )}
                  </Box>
                  {/* ГДЕ на сайте */}
                  <Typography sx={{ fontSize: '0.8rem', color: '#8a7f76', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    📍 {section.where}
                    <a href={section.anchor} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#d4a857', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      смотреть <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </a>
                  </Typography>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
                  {section.fields.map((f) => {
                    const val = getValue(f.key)
                    const def = defaultText(f.key)
                    const isChanged = (values[dbKey(f.key)] ?? '') !== (initial[dbKey(f.key)] ?? '')
                    return (
                      <Box key={f.key}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '230px 1fr' },
                          gap: 1.5, alignItems: 'start',
                          p: 1.2, borderRadius: '10px',
                          background: isChanged ? 'rgba(232,145,90,0.07)' : 'transparent',
                          border: isChanged ? '1px solid rgba(232,145,90,0.3)' : '1px solid transparent',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#c4b8ab' }}>
                            {f.label}
                          </Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: '#6b6058', fontFamily: 'monospace' }}>
                            {f.key}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                          <TextField
                            value={val}
                            onChange={(e) => setValue(f.key, e.target.value)}
                            placeholder={def || '— нет текста по умолчанию —'}
                            multiline={!!f.multiline}
                            minRows={f.multiline ? 2 : 1}
                            fullWidth
                            size="small"
                            sx={inputSx}
                          />
                          {val && (
                            <Tooltip title="Вернуть текст по умолчанию">
                              <IconButton size="small" onClick={() => resetField(f.key)}
                                sx={{ color: '#8a7f76', mt: 0.3 }}>
                                <RestoreIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>

      {/* Панель сохранения */}
      <Box
        sx={{
          position: 'sticky', bottom: 0, mt: 3, py: 2, px: 2.5,
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          background: 'rgba(34,28,42,0.96)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,168,87,0.25)', borderRadius: '16px',
        }}
      >
        <MuiButton
          variant="contained" onClick={saveAll} disabled={saving || changedKeys.length === 0}
          sx={{
            background: 'linear-gradient(135deg, #d4a857, #e8915a)',
            fontWeight: 700, borderRadius: '999px', px: 4, py: 1.2,
            '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: '#6b6058' },
          }}
        >
          {saving ? 'Сохранение…' : 'Сохранить изменения'}
        </MuiButton>

        {changedKeys.length > 0 ? (
          <Typography sx={{ fontSize: '0.88rem', color: '#e8915a', fontWeight: 600 }}>
            Не сохранено: {changedKeys.length} полей
            {changedInLang > 0 && ` (на этом языке: ${changedInLang})`}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: '0.88rem', color: '#8a7f76' }}>Все изменения сохранены</Typography>
        )}

        {changedKeys.length > 0 && (
          <MuiButton size="small" onClick={() => setValues({ ...initial })}
            sx={{ color: '#8a7f76', textTransform: 'none' }}>
            Отменить всё
          </MuiButton>
        )}
      </Box>

      <Snackbar
        open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast && <Alert severity={toast.type} onClose={() => setToast(null)}>{toast.msg}</Alert>}
      </Snackbar>
    </motion.div>
  )
}
