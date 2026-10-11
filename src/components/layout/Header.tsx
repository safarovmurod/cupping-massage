import { Link } from 'react-router-dom'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import BrandMark from '../brand/BrandMark.tsx'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { BRAND_NAME, INSTAGRAM_DM_URL, INSTAGRAM_URL, getBrandCopy } from '../../lib/brand.ts'
import '../../pages/mama-malish.css'

// Retained as a compatibility export for older, non-public admin components.
export const getWhatsAppLink = (_lang = 'ru', _type = 'general') => INSTAGRAM_DM_URL

export default function Header() {
  const { lang, changeLang } = useLang()
  const { user, profile } = useAuth()
  const copy = getBrandCopy(lang)
  const links = [
    { href: '/#home', text: copy.nav[0] },
    { href: '/#services', text: copy.nav[1] },
    { href: '/#faq', text: copy.nav[3] },
    { href: '/contact', text: copy.nav[4] },
  ]
  return (
    <header className="mm-header">
      <div className="mm-shell mm-header-inner">
        <Link to="/" className="mm-logo" aria-label={BRAND_NAME}><span className="mm-logo-mark" aria-hidden="true"><BrandMark size={38} /></span><span>{BRAND_NAME}<small>{copy.tagline}</small></span></Link>
        <nav aria-label={lang === 'tj' ? 'Роҳнамо' : 'Navigation'} className="mm-header-nav">
          {links.map(item => item.href.startsWith('/#') ? <a key={item.href} href={item.href}>{item.text}</a> : <Link key={item.href} to={item.href}>{item.text}</Link>)}
        </nav>
        <div className="mm-header-actions">
          <div className="mm-language" aria-label="Language">{['ru', 'tj', 'en'].map(l => <button key={l} type="button" aria-pressed={l === lang} onClick={() => changeLang(l)}>{l.toUpperCase()}</button>)}</div>
          {user && profile?.role === 'admin' && profile?.is_active === true && <Link to="/admin" className="mm-admin-link">{lang === 'tj' ? 'Админ' : 'Admin'}</Link>}
          <a href={INSTAGRAM_DM_URL} className="mm-header-cta" target="_blank" rel="noopener noreferrer">Instagram <ArrowOutwardRounded aria-hidden="true" sx={{ fontSize: 16 }} /></a>
        </div>
      </div>
    </header>
  )
}
