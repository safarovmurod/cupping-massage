import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import MobileNav from './MobileNav.tsx'
import BrandMark from '../brand/BrandMark.tsx'
import LanguageSelect from '../brand/LanguageSelect.tsx'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { BRAND_NAME } from '../../lib/brand.ts'
import { siteCopy } from '../../lib/site-copy.ts'
import useBrandCopy from '../../hooks/useBrandCopy.ts'

export default function Header() {
  const { lang } = useLang()
  const copy = useBrandCopy()
  const text = siteCopy[lang]
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash])
  const links = [
    { href: '/#home', text: copy.nav[0] }, { href: '/#services', text: copy.nav[1] },
    { href: '/#faq', text: copy.nav[3] }, { href: '/#location', text: text.locationNav },
  ]
  return <>
    <header className="mm-header">
      <div className="mm-shell mm-header-inner">
        <Link to="/" className="mm-logo" aria-label={BRAND_NAME}><BrandMark /><span>{BRAND_NAME}<small>{copy.tagline}</small></span></Link>
        <nav className="mm-header-nav" aria-label={lang === 'ru' ? 'Навигация' : lang === 'tj' ? 'Менюи асосӣ' : 'Navigation'}>
          {links.map(item => <Link key={item.href} to={item.href}>{item.text}</Link>)}
        </nav>
        <div className="mm-header-actions">
          <LanguageSelect />
          <IconButton className="mm-mobile-toggle" aria-label={text.menu} aria-expanded={menuOpen} aria-controls="mm-mobile-menu" onClick={() => setMenuOpen(true)} sx={{ color: '#74374f', minWidth: 44, minHeight: 44 }}><MenuRounded /></IconButton>
        </div>
      </div>
    </header>
    <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)} PaperProps={{ id: 'mm-mobile-menu', sx: { background: '#fffdfb', color: '#30242e', width: 'min(340px,94vw)', p: 2.5 } }}>
      <div className="mm-mobile-menu-head"><BrandMark /><strong>{BRAND_NAME}</strong><IconButton aria-label={text.closeMenu} onClick={() => setMenuOpen(false)} sx={{ ml: 'auto', color: '#74374f', minWidth: 44, minHeight: 44 }}><CloseRounded /></IconButton></div>
      <nav className="mm-mobile-nav" aria-label={text.menu}>{links.map(item => <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>{item.text}</Link>)}</nav>
      <Link to="/#contact" onClick={() => setMenuOpen(false)} className="mm-btn mm-btn-primary mm-mobile-menu-cta">{text.bookingNav}</Link>
    </Drawer>
    {location.pathname === '/' && <MobileNav />}
  </>
}
