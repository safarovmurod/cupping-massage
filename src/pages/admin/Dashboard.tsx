import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import { supabase } from '../../lib/supabase.ts'
import AnalyticsOverview from '../../components/admin/AnalyticsOverview.tsx'

const shortcuts = [
  { to: '/admin/leads', title: 'Заявки', text: 'Кто хочет записаться: имя, телефон и статус заявки.' },
  { to: '/admin/users', title: 'Клиенты', text: 'Зарегистрированные аккаунты и данные их профилей.' },
  { to: '/admin/analytics', title: 'Посещения и источники', text: 'Просмотры, Instagram, WhatsApp и последние события.' },
  { to: '/admin/content', title: 'Тексты сайта', text: 'Изменить заголовки, описания и цены.' },
  { to: '/admin/contacts', title: 'Контакты', text: 'Настройки адреса, телефона и социальных сетей.' },
  { to: '/admin/password-resets', title: 'Помощь со входом', text: 'Заявки на восстановление доступа клиентов.' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState('')

  async function fetchStats() {
    const { data, error: requestError } = await supabase.rpc('admin_analytics_summary')
    if (requestError) { setError('Статистика недоступна. Проверьте подключение и повторите запрос.'); return }
    setStats(data)
    setError('')
    setUpdated(new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Dushanbe' }))
  }

  useEffect(() => {
    fetchStats()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') fetchStats() }, 30000)
    return () => clearInterval(timer)
  }, [])

  const maxVisits = stats ? Math.max(1, ...stats.days.map(day => Math.max(day.visits, day.clicks))) : 1

  return <Stack gap="24px">
    <Box>
      <Typography component="h1" sx={{ fontSize: { xs: '26px', lg: '32px' }, fontWeight: 700, mb: '8px' }}>Управление сайтом</Typography>
      <Typography sx={{ color: '#c4b8ab', fontSize: '15px' }}>Начните с нужного раздела. Новые записи клиентов — в «Заявках», посещения — в «Статистике».</Typography>
    </Box>
    <Grid container spacing={2}>
      {shortcuts.map(item => <Grid item xs={12} sm={6} lg={4} key={item.to}>
        <Button component={Link} to={item.to} fullWidth variant="outlined" sx={{ height: '100%', justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'column', padding: '20px', borderRadius: '18px', borderColor: '#e2aec055', textAlign: 'left' }}>
          <Typography component="span" sx={{ fontSize: '18px', fontWeight: 700, mb: '6px' }}>{item.title} →</Typography>
          <Typography component="span" sx={{ fontSize: '14px', color: '#c4b8ab' }}>{item.text}</Typography>
        </Button>
      </Grid>)}
    </Grid>
    <Stack direction="row" gap="12px" alignItems="center" flexWrap="wrap">
      <Typography component="h2" sx={{ fontSize: '22px', fontWeight: 700 }}>Реальные данные сайта</Typography>
      <Button onClick={fetchStats} variant="outlined">Обновить</Button>
      {updated && <Typography sx={{ fontSize: '13px', color: '#c4b8ab' }}>Обновлено {updated} · Душанбе</Typography>}
    </Stack>
    {error && <Alert severity="error">{error} {stats && 'Ниже — последнее успешное обновление.'}</Alert>}
    {!stats && !error && <Typography role="status">Загрузка статистики…</Typography>}
    <AnalyticsOverview summary={stats} />
    {stats && <Card><CardContent>
      <Typography component="h2" sx={{ fontSize: '20px', fontWeight: 700, mb: '20px' }}>Просмотры за 7 дней · Душанбе</Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px' }}>
        {stats.days.map(day => <Box key={day.day} sx={{ flex: 1, minWidth: '0px', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '12px', mb: '6px' }}>{day.visits}</Typography>
          <Box sx={{ height: `${day.visits / maxVisits * 140}px`, minHeight: day.visits ? '2px' : '0px', borderRadius: '8px 8px 0 0', background: '#e2aec0' }} />
          <Typography sx={{ fontSize: '12px', mt: '8px', color: '#c4b8ab' }}>{new Date(day.day).toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'Asia/Dushanbe' })}</Typography>
        </Box>)}
      </Box>
    </CardContent></Card>}
  </Stack>
}
