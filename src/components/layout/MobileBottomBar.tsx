import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import HomeRounded from '@mui/icons-material/HomeRounded'
import SpaRounded from '@mui/icons-material/SpaRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import MenuRounded from '@mui/icons-material/MenuRounded'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { getWhatsAppLink } from './Header.tsx'
import { trackWhatsAppClick, trackLanguageChange } from '../../lib/analytics.ts'
import LoadErrorBoundary, { LoadErrorNotice } from '../common/LoadErrorBoundary.tsx'

const MobileMenu = lazy(() => import('./MobileMenu.tsx'))

const copy = {
  ru: { menu: 'Меню', caption: 'Баночный массаж', book: 'Записаться на массаж', account: 'Ваш аккаунт', preferences: 'Язык и оформление', theme: 'Сменить тему', close: 'Закрыть меню', admin: 'Управление сайтом' },
  tj: { menu: 'Меню', caption: 'Массажи бонкагӣ', book: 'Ба массаж нависед', account: 'Аккаунти шумо', preferences: 'Забон ва намуди сайт', theme: 'Иваз кардани намуди сайт', close: 'Пӯшидани меню', admin: 'Идоракунии сайт' },
  en: { menu: 'Explore', caption: 'Cupping massage', book: 'Book a massage', account: 'Your account', preferences: 'Language & appearance', theme: 'Change theme', close: 'Close menu', admin: 'Manage website' },
}

export default function MobileBottomBar() {
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const { lang, changeLang, t } = useLang()
  const { theme, toggleTheme } = useTheme()
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const text = copy[lang]
  const isAdmin = profile?.role === 'admin' && profile?.is_active === true
  const dark = theme === 'dark'
  const colors = dark
    ? { background: '#1d1d1b', surface: '#282824', text: '#f5f1e8', muted: '#b7b4aa', line: '#ffffff1a', accent: '#d7bd88' }
    : { background: '#f7f4ee', surface: '#eeebe3', text: '#292b25', muted: '#64675d', line: '#292b251c', accent: '#6a5934' }
  const accountName = profile?.full_name || user?.user_metadata?.full_name || user?.email || ''
  useEffect(() => { setOpen(false) }, [location])

  const links = [
    { to: '/', label: t('mobile.home'), icon: HomeRounded },
    { to: '/#services', label: t('mobile.services'), icon: SpaRounded },
  ]
  const menuLinks = [
    ...links,
    { to: '/#pricing', label: t('nav.prices') },
    { to: '/contact', label: t('mobile.contacts') },
  ]
  const dockButton = {
    flex: 1, minWidth: '0px', minHeight: '58px', flexDirection: 'column', gap: '4px',
    px: '2px', py: '8px', borderRadius: '12px', color: colors.muted, fontSize: '11px',
    lineHeight: 1.2, fontWeight: 500, textTransform: 'none', '&:hover': { background: colors.surface, color: colors.text },
  }

  function handleNavigate(to) {
    setOpen(false)
    if (location.pathname + location.hash !== to) return
    const target = to.split('#')[1]
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleLanguage(value) {
    trackLanguageChange(lang, value)
    changeLang(value)
  }

  async function handleSignOut() {
    await signOut()
    setOpen(false)
  }

  return <>
    <Box component="nav" aria-label="Мобильная навигация" sx={{
      display: 'flex', '@media (min-width: 1024px)': { display: 'none' }, position: 'fixed', zIndex: 1200,
      bottom: 'max(12px, env(safe-area-inset-bottom))', left: '12px', right: '12px', maxWidth: '480px', mx: 'auto',
      gap: '4px', padding: '6px', borderRadius: '20px', background: colors.background,
      border: '1px solid ' + colors.line, boxShadow: '0 8px 28px #00000026',
    }}>
      {links.map(item => {
        const active = location.pathname + location.hash === item.to
        const ItemIcon = item.icon
        return <Button key={item.to} component={Link} to={item.to} onClick={() => handleNavigate(item.to)}
          aria-current={active ? 'page' : undefined}
          sx={{ ...dockButton, color: active ? colors.accent : colors.muted, background: active ? colors.surface : 'transparent' }}>
          <ItemIcon sx={{ fontSize: '23px' }} />{item.label}
        </Button>
      })}
      <Button component="a" href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick('mobile')} sx={dockButton}>
        <WhatsApp sx={{ fontSize: '23px' }} />WhatsApp
      </Button>
      <Button ref={menuButton} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? "mobile-menu" : undefined} sx={dockButton}>
        <MenuRounded sx={{ fontSize: '23px' }} />{text.menu}
      </Button>
    </Box>
    {open && <LoadErrorBoundary fallback={<LoadErrorNotice onClose={() => {
      setOpen(false)
      menuButton.current?.focus()
    }} />}>
      <Suspense fallback={null}>
        <MobileMenu open={open} setOpen={setOpen} colors={colors} text={text} menuLinks={menuLinks} handleNavigate={handleNavigate} lang={lang} user={user} accountName={accountName} isAdmin={isAdmin} t={t} handleSignOut={handleSignOut} handleLanguage={handleLanguage} toggleTheme={toggleTheme} dark={dark} />
      </Suspense>
    </LoadErrorBoundary>}
  </>
}
