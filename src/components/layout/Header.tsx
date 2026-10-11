import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import Instagram from '@mui/icons-material/Instagram'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import BrandMark from '../brand/BrandMark.tsx'
import LanguageSelect from '../brand/LanguageSelect.tsx'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { BRAND_NAME, INSTAGRAM_DM_URL } from '../../lib/brand.ts'
import { WHATSAPP_NUMBER } from '../../lib/booking.ts'
import useBrandCopy from '../../hooks/useBrandCopy.ts'
import '../../pages/mama-malish.css'

export const getWhatsAppLink = (_lang = 'ru', _type = 'general') => 'https://wa.me/' + WHATSAPP_NUMBER

export default function Header() {
  const { lang, t } = useLang()
  const { user, profile } = useAuth()
  const copy = useBrandCopy()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash])
  const menuTitle = lang === 'tj' ? 'Менюро кушоед' : lang === 'en' ? 'Open menu' : 'Открыть меню'
  const closeTitle = lang === 'tj' ? 'Менюро пӯшед' : lang === 'en' ? 'Close menu' : 'Закрыть меню'
  const links = [
    { href: '/#home', text: copy.nav[0] },
    { href: '/services', text: copy.nav[1] },
    { href: '/services', text: copy.nav[2] },
    { href: '/about', text: copy.aboutEyebrow },
    { href: '/faq', text: copy.nav[3] },
    { href: '/contact', text: copy.nav[4] },
  ]
  const admin = user && profile?.role === 'admin' && profile?.is_active === true
  return (
    <>
      <header className="mm-header">
        <div className="mm-shell mm-header-inner">
          <Link to="/" className="mm-logo" aria-label={BRAND_NAME}>
            <span className="mm-logo-mark" aria-hidden="true"><BrandMark size={38}/></span>
            <span>{BRAND_NAME}<small>{copy.tagline}</small></span>
          </Link>
          <nav aria-label={lang === 'tj' ? 'Роҳнамо' : 'Navigation'} className="mm-header-nav">
            {links.map(item => <Link key={item.href} to={item.href}>{item.text}</Link>)}
          </nav>
          <div className="mm-header-actions">
            <LanguageSelect />
            <div className="mm-auth-links">
              {!user && <><Link to="/login">{t('nav.login')}</Link><Link to="/register">{t('nav.register')}</Link></>}
              {admin && <Link to="/admin">{t('nav.admin')}</Link>}
            </div>
            <Link to="/booking" className="mm-header-cta mm-header-whatsapp"><WhatsApp sx={{ fontSize: 19 }} aria-hidden="true" /> WhatsApp</Link><a href={INSTAGRAM_DM_URL} className="mm-header-cta mm-header-instagram" target="_blank" rel="noopener noreferrer"><Instagram sx={{ fontSize: 19 }} aria-hidden="true" /> Instagram</a>
            <IconButton className="mm-mobile-toggle" aria-label={menuTitle} aria-expanded={menuOpen} aria-controls="mm-mobile-menu" onClick={() => setMenuOpen(true)} sx={{ color: '#74374f', minWidth: 44, minHeight: 44 }}><MenuRounded /></IconButton>
          </div>
        </div>
      </header>
      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)}
        PaperProps={{ id:'mm-mobile-menu', sx:{ background:'#fffdfb', color:'#30242e', width:'min(340px, 94vw)', p:2.5 } }}>
        <div className="mm-mobile-menu-head"><BrandMark size={40}/><strong>{BRAND_NAME}</strong>
          <IconButton aria-label={closeTitle} onClick={() => setMenuOpen(false)} sx={{ ml:'auto', color:'#74374f', minWidth:44, minHeight:44 }}><CloseRounded /></IconButton>
        </div>
        <nav className="mm-mobile-nav" aria-label={menuTitle}>
          {links.map(item => <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>{item.text}</Link>)}
          {!user && <><Link to="/login" onClick={() => setMenuOpen(false)}>{t('nav.login')}</Link><Link to="/register" onClick={() => setMenuOpen(false)}>{t('nav.register')}</Link></>}
          {admin && <Link to="/admin" onClick={() => setMenuOpen(false)}>{t('nav.admin')}</Link>}
        </nav>
        <Link to="/booking" onClick={() => setMenuOpen(false)} className="mm-btn mm-btn-primary mm-mobile-menu-cta"><WhatsApp fontSize="small" /> WhatsApp</Link><a href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer" className="mm-btn mm-btn-outline mm-mobile-menu-cta">{copy.instagramButton} <ArrowOutwardRounded aria-hidden="true" fontSize="small"/></a>
      </Drawer>
    </>
  )
}
