import { getBrandCopy } from '../lib/brand.ts'
import { useLang } from '../contexts/LanguageContext.tsx'
export default function useBrandCopy() { return getBrandCopy(useLang().lang) }
