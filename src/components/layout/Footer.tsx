import { Link } from 'react-router-dom'
import BrandMark from '../brand/BrandMark.tsx'
import Instagram from '@mui/icons-material/Instagram'
import WhatsApp from '@mui/icons-material/WhatsApp'
import { getWhatsAppBookingUrl } from '../../lib/booking.ts'
import { BRAND_NAME, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../../lib/brand.ts'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { siteCopy } from '../../lib/site-copy.ts'
import useBrandCopy from '../../hooks/useBrandCopy.ts'

export default function Footer() {
  const copy = useBrandCopy()
  const text = siteCopy[useLang().lang]
  return <footer className="mm-footer"><div className="mm-shell mm-footer-inner">
    <div><Link to="/" className="mm-footer-brand"><BrandMark size={36} />{BRAND_NAME}</Link><p>{copy.footer}</p><small>{copy.copyright}</small></div>
    <div className="mm-footer-links"><Link to="/#contact">{text.bookingNav}</Link><a className="mm-messenger-label" href={getWhatsAppBookingUrl('')} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp: +992 00 733 6264"><WhatsApp fontSize="small" aria-hidden="true" />+992 00 733 6264</a><a className="mm-messenger-label" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={'Instagram: ' + INSTAGRAM_HANDLE}><Instagram fontSize="small" aria-hidden="true" />{INSTAGRAM_HANDLE}</a><small>{text.photoNote}</small></div>
  </div></footer>
}
