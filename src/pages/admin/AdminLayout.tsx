import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import MuiMenuIcon from '@mui/icons-material/Menu'
import MuiCloseIcon from '@mui/icons-material/Close'
import MuiLogoutIcon from '@mui/icons-material/Logout'
import MuiKeyIcon from '@mui/icons-material/VpnKey'
import MuiSiteIcon from '@mui/icons-material/Language'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { supabase } from '../../lib/supabase.ts'
import { LogoIcon, DashboardIcon, UsersIcon, LeadsIcon, EditIcon, SettingsIcon, ChartIcon, MapPinIcon } from '../../components/icons/Icons.tsx'

const drawerWidth = 250

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingResets, setPendingResets] = useState(0)

  const handleLogout = async () => { await signOut(); navigate('/') }

  // Счётчик новых заявок на сброс пароля (обновляется раз в минуту)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const { count } = await supabase
        .from('password_reset_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (alive) setPendingResets(count || 0)
    }
    load()
    const timer = setInterval(load, 60000)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  const navItems = [
    { to: '/admin', icon: DashboardIcon, label: 'Главная', end: true },
    { to: '/admin/users', icon: UsersIcon, label: 'Клиенты' },
    { to: '/admin/leads', icon: LeadsIcon, label: 'Заявки' },
    { to: '/admin/content', icon: EditIcon, label: 'Тексты сайта' },
    { to: '/admin/contacts', icon: MapPinIcon, label: 'Контакты' },
    { to: '/admin/password-resets', icon: () => <MuiKeyIcon sx={{ fontSize: 22 }} />, label: 'Сброс пароля', badge: pendingResets },
    { to: '/admin/analytics', icon: ChartIcon, label: 'Статистика' },
    { to: '/admin/settings', icon: SettingsIcon, label: 'Настройки' },
  ]

  // Заголовок в шапке = название текущей страницы
  const currentTitle = (
    navItems.filter(i => i.to !== '/admin')
      .find(i => location.pathname.startsWith(i.to))?.label
  ) || 'Главная'

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#221c2a' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid rgba(212,168,87,0.2)' }}>
        <LogoIcon size={32} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#f5ede4' }}>Админ-панель</Typography>
      </Box>

      {/* КНОПКА ВОЗВРАТА НА САЙТ */}
      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Button
          fullWidth variant="contained" href="/" component="a"
          startIcon={<MuiSiteIcon />}
          onClick={() => setMobileOpen(false)}
          sx={{
            background: 'linear-gradient(135deg, #d4a857, #e8915a)',
            fontWeight: 700, borderRadius: '12px', py: 1.2, textTransform: 'none',
            fontSize: '0.88rem', color: '#fff',
            '&:hover': { background: 'linear-gradient(135deg, #e8c178, #e8915a)', boxShadow: '0 6px 18px rgba(212,168,87,0.35)' },
          }}
        >
          Вернуться на сайт
        </Button>
      </Box>
      <List sx={{ flex: 1, p: 1.5, gap: 0.5 }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({ textDecoration: 'none', display: 'block' })}
            onClick={() => setMobileOpen(false)}
          >
            {({ isActive }) => (
              <ListItemButton sx={{
                borderRadius: '12px', mb: 0.5, px: 2, py: 1.5,
                background: isActive ? 'linear-gradient(135deg, #d4a857, #e8915a)' : 'transparent',
                color: isActive ? '#fff' : '#c4b8ab',
                '&:hover': { background: isActive ? 'linear-gradient(135deg, #e8c178, #e8915a)' : 'rgba(255,255,255,0.05)' },
              }}>
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><item.icon width={22} height={22} /></ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
                {item.badge > 0 && (
                  <Chip label={item.badge} size="small"
                    sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700,
                          background: isActive ? 'rgba(255,255,255,0.25)' : '#e8915a', color: '#fff' }} />
                )}
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(212,168,87,0.2)' }} />
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: '0.82rem', color: '#8a7f76', mb: 1 }}>{profile?.full_name || user?.email}</Typography>
        <Button fullWidth variant="outlined" size="small" onClick={handleLogout}
          sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c4b8ab', '&:hover': { borderColor: '#d4a857', color: '#d4a857' } }}
          startIcon={<MuiLogoutIcon />}>Выйти</Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#1a1520' }}>
      <AppBar position="fixed" sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` },
        background: 'rgba(26,21,32,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212,168,87,0.2)', boxShadow: 'none',
      }}>
        <Toolbar>
          <Button color="inherit" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen}
            startIcon={mobileOpen ? <MuiCloseIcon /> : <MuiMenuIcon />}
            sx={{ mr: '12px', display: { md: 'none' }, textTransform: 'none', minWidth: '0px' }}>Меню</Button>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: '#f5ede4', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {currentTitle}
          </Typography>
          <Typography sx={{ fontSize: '0.88rem', color: '#8a7f76', display: { xs: 'none', md: 'block' }, mr: 1.5 }}>
            {user?.email}
          </Typography>

          {/* КНОПКА "НА САЙТ" В ШАПКЕ */}
          <Tooltip title="Вернуться на сайт">
            <Button
              href="/" component="a" variant="outlined" size="small"
              startIcon={<MuiSiteIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: 'rgba(212,168,87,0.5)', color: '#d4a857',
                borderRadius: '999px', textTransform: 'none', fontWeight: 600,
                whiteSpace: 'nowrap', px: { xs: 1.5, sm: 2 },
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.8 } },
                '&:hover': { borderColor: '#d4a857', background: 'rgba(212,168,87,0.1)' },
              }}
            >
              <Box component="span">На сайт</Box>
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, borderRight: '1px solid rgba(212,168,87,0.2)' } }}>
          {drawerContent}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, borderRight: '1px solid rgba(212,168,87,0.2)', boxSizing: 'border-box' } }}>
          {drawerContent}
        </Drawer>
      </Box>

      {/* minWidth: 0 обязателен: без него flex-элемент не сжимается меньше
          своего содержимого, и на телефоне вся админка вылезала за экран */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 }, mt: '64px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  )
}
