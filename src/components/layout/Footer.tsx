import { Link } from 'react-router-dom'
import WhatsApp from '@mui/icons-material/WhatsApp'
import Instagram from '@mui/icons-material/Instagram'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import BrandMark from '../brand/BrandMark.tsx'
import { BRAND_NAME, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../../lib/brand.ts'
import { WHATSAPP_NUMBER } from '../../lib/booking.ts'
import useBrandCopy from '../../hooks/useBrandCopy.ts'
import '../../pages/mama-malish.css'
export const INSTAGRAM_NAME = INSTAGRAM_HANDLE
export default function Footer() {
  const copy = useBrandCopy()
  return <footer className="mm-footer"><div className="mm-shell mm-footer-inner">
    <div><Link to="/" className="mm-footer-brand"><BrandMark size={30} /> {BRAND_NAME}</Link><p>{copy.footer}</p><small>{copy.copyright}</small></div>
    <div className="mm-footer-actions"><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><Instagram sx={{fontSize:20}} aria-hidden="true"/>{INSTAGRAM_HANDLE} <ArrowOutwardRounded aria-hidden="true" sx={{ fontSize: 15 }} /></a><a href={"https://wa.me/" + WHATSAPP_NUMBER} target="_blank" rel="noopener noreferrer"><WhatsApp sx={{fontSize:20}} aria-hidden="true"/> WhatsApp</a><Link to="/booking">{copy.formButton} →</Link><p>{copy.hoursLabel}</p></div>
  </div></footer>
}
