import { Link } from 'react-router-dom'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { BRAND_NAME, INSTAGRAM_URL, INSTAGRAM_HANDLE, getBrandCopy } from '../../lib/brand.ts'
import '../../pages/mama-malish.css'
export const INSTAGRAM_NAME = INSTAGRAM_HANDLE
export default function Footer() {
  const { lang } = useLang()
  const copy = getBrandCopy(lang)
  return <footer className="mm-footer"><div className="mm-shell mm-footer-inner">
    <div><Link to="/" className="mm-footer-brand">{BRAND_NAME} ♡</Link><p>{copy.footer}</p><small>{copy.copyright}</small></div>
    <div><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE} ↗</a><p>{copy.hoursLabel}</p></div>
  </div></footer>
}
