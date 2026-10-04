import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloseRounded from '@mui/icons-material/CloseRounded'
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { Link } from 'react-router-dom'
import WhatsApp from '@mui/icons-material/WhatsApp'
import { getWhatsAppLink } from './Header.tsx'
import { trackWhatsAppClick } from '../../lib/analytics.ts'

export default function MobileMenu({ open, setOpen, colors, text, menuLinks, handleNavigate, lang, user, accountName, isAdmin, t, handleSignOut, handleLanguage, toggleTheme, dark }) {
  return (
    <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)}
      sx={{ '@media (min-width: 1024px)': { display: 'none' } }}
      slotProps={{ backdrop: { sx: { background: '#10120f99', backdropFilter: 'blur(6px)' } } }}
      PaperProps={{ id: 'mobile-menu', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'mobile-menu-title', sx: {
        width: '100%', maxWidth: '520px', maxHeight: '92dvh', mx: 'auto',
        padding: '24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', borderRadius: '28px 28px 0 0',
        background: colors.background, color: colors.text, border: '1px solid ' + colors.line,
      } }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap="12px" sx={{ mb: '20px' }}>
        <Box>
          <Typography sx={{ color: colors.muted, fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', mb: '6px' }}>{text.caption}</Typography>
          <Typography id="mobile-menu-title" component="h2" sx={{ color: colors.text, fontSize: '34px', lineHeight: 1.15, fontWeight: 500, letterSpacing: '-1px' }}>{text.menu}</Typography>
        </Box>
        <IconButton aria-label={text.close} onClick={() => setOpen(false)} sx={{ width: '44px', height: '44px', border: '1px solid ' + colors.line, color: colors.text }}><CloseRounded sx={{ fontSize: '22px' }} /></IconButton>
      </Stack>
      <Box component="nav" aria-label={text.menu} sx={{ mb: '22px' }}>
        {menuLinks.map((item, index) => <Button key={item.to} component={Link} to={item.to} onClick={() => handleNavigate(item.to)} fullWidth
          sx={{ justifyContent: 'flex-start', gap: '16px', minHeight: '54px', px: '0px', py: '12px', borderRadius: '0px', borderBottom: '1px solid ' + colors.line, color: colors.text, fontSize: '20px', fontWeight: 400, textTransform: 'none', '&:hover': { background: colors.surface, color: colors.accent } }}>
          <Box component="span" sx={{ color: colors.muted, fontSize: '11px', fontWeight: 400 }}>{String(index + 1).padStart(2, '0')}</Box>
          {item.label}<ArrowForwardRounded sx={{ ml: 'auto', color: colors.muted, fontSize: '19px' }} />
        </Button>)}
      </Box>
      <Button component="a" href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsAppClick('mobile-menu')}
        startIcon={<WhatsApp />} endIcon={<ArrowForwardRounded />} sx={{ justifyContent: 'space-between', flexShrink: 0, minHeight: '54px', px: '18px', mb: '20px', borderRadius: '12px', background: '#d7bd88', color: '#24261f', fontSize: '14px', fontWeight: 600, textTransform: 'none', '&:hover': { background: '#e4cca1', color: '#24261f' } }}>
        {text.book}
      </Button>
      {user ? <Box sx={{ p: '14px', mb: '20px', borderRadius: '12px', background: colors.surface }}>
        <Stack direction="row" alignItems="center" gap="12px">
          <Box sx={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', flexShrink: 0, border: '1px solid ' + colors.line, borderRadius: '50%', color: colors.accent, fontSize: '16px' }}>{accountName.charAt(0).toUpperCase()}</Box>
          <Box sx={{ flex: 1, minWidth: '0px' }}>
            <Typography sx={{ color: colors.muted, fontSize: '11px', mb: '2px' }}>{text.account}</Typography>
            <Typography sx={{ color: colors.text, fontSize: '14px', lineHeight: 1.4, overflowWrap: 'anywhere' }}>{accountName}</Typography>
          </Box>
          <IconButton aria-label={t('nav.logout')} onClick={handleSignOut} sx={{ width: '44px', height: '44px', color: colors.muted }}><LogoutRounded sx={{ fontSize: '20px' }} /></IconButton>
        </Stack>
        {isAdmin && <Button component={Link} to="/admin" fullWidth startIcon={<AdminPanelSettingsRounded />} endIcon={<ArrowForwardRounded />} sx={{ justifyContent: 'space-between', minHeight: '44px', mt: '12px', px: '0px', borderTop: '1px solid ' + colors.line, borderRadius: '0px', color: colors.accent, textTransform: 'none' }}>{text.admin}</Button>}
      </Box> : <Stack direction="row" gap="12px" sx={{ mb: '20px' }}>
        <Button component={Link} to="/login" fullWidth sx={{ minHeight: '44px', borderRadius: '10px', background: colors.surface, color: colors.text, textTransform: 'none' }}>{t('nav.login')}</Button>
        <Button component={Link} to="/register" fullWidth sx={{ minHeight: '44px', borderRadius: '10px', color: colors.text, textTransform: 'none' }}>{t('nav.register')}</Button>
      </Stack>}
      <Typography sx={{ color: colors.muted, fontSize: '11px', mb: '10px' }}>{text.preferences}</Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap="12px">
        <Stack direction="row" gap="4px" sx={{ padding: '4px', borderRadius: '12px', background: colors.surface }}>
          {['ru', 'tj', 'en'].map(value => <Button key={value} onClick={() => handleLanguage(value)} aria-pressed={lang === value}
            sx={{ minWidth: '48px', minHeight: '40px', padding: '8px', borderRadius: '8px', background: lang === value ? colors.background : 'transparent', color: lang === value ? colors.accent : colors.muted, fontSize: '12px', textTransform: 'none' }}>{value.toUpperCase()}</Button>)}
        </Stack>
        <IconButton onClick={toggleTheme} aria-label={text.theme} sx={{ width: '48px', height: '48px', border: '1px solid ' + colors.line, color: colors.text }}>{dark ? <LightModeRounded sx={{ fontSize: '21px' }} /> : <DarkModeRounded sx={{ fontSize: '21px' }} />}</IconButton>
      </Stack>
    </Drawer>
  )
}
