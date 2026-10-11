import { Link } from 'react-router-dom'
import BrandMark from '../brand/BrandMark.tsx'
import { BRAND_NAME, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../../lib/brand.ts'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { siteCopy } from '../../lib/site-copy.ts'
import useBrandCopy from '../../hooks/useBrandCopy.ts'

export default function Footer() {
  const copy = useBrandCopy()
  const text = siteCopy[useLang().lang]
  return <footer className="mm-footer"><div className="mm-shell mm-footer-inner">
    <div><Link to="/" className="mm-footer-brand"><BrandMark size={36} />{BRAND_NAME}</Link><p>{copy.footer}</p><small>{copy.copyright}</small></div>
    <div className="mm-footer-links"><Link to="/#contact">{text.bookingNav}</Link><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a><small>{text.photoNote}</small></div>
  </div></footer>
}
