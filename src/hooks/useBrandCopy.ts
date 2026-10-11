import { useMemo } from 'react'
import { getBrandCopy } from '../lib/brand.ts'
import { useLang } from '../contexts/LanguageContext.tsx'

const editable = [
  'tagline', 'eyebrow', 'heroTitle', 'heroLead', 'heroPrimary', 'heroSecondary',
  'featureOne', 'featureTwo', 'featureThree', 'introTitle', 'introText',
  'aboutEyebrow', 'aboutTitle', 'aboutText', 'aboutNote', 'safetyTitle',
  'safetyText', 'safetyDisclaimer', 'faqTitle', 'faqLead',
  'contactTitle', 'contactLead', 'instagramButton', 'profileButton',
  'formButton', 'contactsNote', 'footer', 'hoursLabel', 'copyright',
] as const

// Only brand.* overrides apply to the new public site. Legacy content rows do
// not silently replace verified addresses, credentials, or booking instructions.
export default function useBrandCopy() {
  const { lang, overrides } = useLang()
  return useMemo(() => {
    const base = getBrandCopy(lang)
    const value = (key: string, fallback: string) => {
      const raw = overrides[`brand.${key}.${lang}`] ?? overrides[`brand.${key}`]
      return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback
    }
    const result: typeof base = { ...base }
    for (const key of editable) (result as any)[key] = value(key, base[key])
    result.nav = base.nav.map((item, i) => value(`nav.${i}`, item))
    result.bookingSteps = base.bookingSteps.map((step, i) => value(`bookingSteps.${i}`, step))
    result.prices = base.prices.map((item, i) => ({
      ...item,
      title: value(`prices.${i}.title`, item.title),
      price: value(`prices.${i}.price`, item.price),
      duration: value(`prices.${i}.duration`, item.duration),
      note: value(`prices.${i}.note`, item.note),
    }))
    result.faqs = base.faqs.map((item, i) => ({
      question: value(`faqs.${i}.question`, item.question),
      answer: value(`faqs.${i}.answer`, item.answer),
    }))
    return result
  }, [lang, overrides])
}
