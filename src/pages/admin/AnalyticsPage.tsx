import { useState, useEffect } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { supabase } from '../../lib/supabase.ts'
import AnalyticsOverview from '../../components/admin/AnalyticsOverview.tsx'

const labels = { page_view: 'Просмотр', heartbeat: 'Активная страница', whatsapp_click: 'Клик в WhatsApp', instagram_click: 'Клик в Instagram', form_submit: 'Заявка', language_change: 'Смена языка', login: 'Вход', registration: 'Регистрация' }
const sources = { instagram: 'Instagram', whatsapp: 'WhatsApp', telegram: 'Telegram', google: 'Google', facebook: 'Facebook', yandex: 'Яндекс', unknown: 'Источник не передан', direct: 'Прямой / источник не передан' }
const pageSize = 50

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [profiles, setProfiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('all')
  const [refresh, setRefresh] = useState(0)
  const [updated, setUpdated] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        let query = supabase.from('analytics_visitor_events').select('*', { count: 'exact' }).neq('event_type', 'heartbeat')
        if (filter !== 'all') query = query.eq('event_type', filter)
        const [stats, rows] = await Promise.all([
          supabase.rpc('admin_analytics_summary'),
          query.order('created_at', { ascending: false }).order('id').range(page * pageSize, (page + 1) * pageSize - 1),
        ])
        if (stats.error) throw stats.error
        if (rows.error) throw rows.error
        const userIds = [...new Set(rows.data.map(event => event.user_id).filter(Boolean))]
        let people = []
        if (userIds.length) {
          const result = await supabase.from('profiles').select('id, full_name, email, phone').in('id', userIds)
          if (result.error) throw result.error
          people = result.data
        }
        if (!alive) return
        setSummary(stats.data); setEvents(rows.data); setProfiles(people); setTotal(rows.count || 0)
        setError(''); setUpdated(new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Dushanbe' }))
      } catch {
        if (alive) setError('Не удалось загрузить статистику. Данные не подтверждены. Повторите запрос.')
      } finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [page, filter, refresh])

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setRefresh(value => value + 1) }, 30000)
    return () => clearInterval(timer)
  }, [])

  return <Stack gap="20px">
    <Stack direction="row" gap="12px" alignItems="center" flexWrap="wrap">
      <Typography component="h1" sx={{ fontSize: '26px', fontWeight: 700 }}>Посещения и источники</Typography>
      <Button variant="outlined" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Обновить</Button>
      {updated && <Typography sx={{ fontSize: '13px', color: '#c4b8ab' }}>Обновлено {updated} · Душанбе</Typography>}
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
    {loading && <Typography role="status">Обновление…</Typography>}
    <Alert severity="info">Instagram и WhatsApp не передают имя аккаунта или номер посетителя при открытии ссылки. Имя ниже — только из аккаунта сайта после входа. Телефон — введён пользователем и не подтверждён WhatsApp. Источник определяется по метке ссылки или referrer и не подтверждает личность.</Alert>
    <AnalyticsOverview summary={summary} />
    {summary && <Card><CardContent>
      <Typography component="h2" sx={{ fontSize: '20px', fontWeight: 700, mb: '16px' }}>Откуда открывали сайт</Typography>
      {summary.sources.length === 0 && <Typography>Записанных просмотров пока нет.</Typography>}
      <Stack gap="14px">{summary.sources.map(item => <Box key={item.key}>
        <Stack direction="row" justifyContent="space-between" gap="12px"><Typography>{sources[item.key] || item.key}</Typography><Typography sx={{ fontSize: '13px', color: '#c4b8ab' }}>{item.visitors} браузеров · {item.views} просмотров</Typography></Stack>
        <Box sx={{ height: '6px', mt: '6px', background: '#ffffff15', borderRadius: '6px' }}><Box sx={{ height: '100%', width: `${item.views / Math.max(1, summary.totalVisits) * 100}%`, background: '#e2aec0', borderRadius: '6px' }} /></Box>
      </Box>)}</Stack>
    </CardContent></Card>}
    <Card><CardContent>
      <Typography component="h2" sx={{ fontSize: '20px', fontWeight: 700, mb: '12px' }}>Ссылки для Instagram и WhatsApp</Typography>
      <Typography sx={{ fontSize: '14px', color: '#c4b8ab', mb: '12px' }}>Разместите соответствующую ссылку в профиле или сообщении. Метка покажет источник перехода, даже когда приложение не передаёт referrer.</Typography>
      {['instagram', 'whatsapp'].map(source => <Typography key={source} sx={{ fontSize: '13px', overflowWrap: 'anywhere', mb: '8px' }}>{sources[source]}: {window.location.origin}/?utm_source={source}</Typography>)}
    </CardContent></Card>
    <Stack direction="row" alignItems="center" gap="12px" flexWrap="wrap">
      <Typography component="h2" sx={{ fontSize: '20px', fontWeight: 700 }}>Журнал событий</Typography>
      <Select size="small" value={filter} inputProps={{ 'aria-label': 'Тип события' }} onChange={event => { setFilter(event.target.value); setPage(0) }}>
        <MenuItem value="all">Все события</MenuItem>
        {Object.entries(labels).filter(([key]) => key !== 'heartbeat').map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
      </Select>
    </Stack>
    <Typography sx={{ fontSize: '13px', color: '#c4b8ab' }}>Посещения учитываются после согласия на аналитику. Счётчик регистраций берётся из профилей в базе. Журнал ниже показывает одну страницу событий, общие счётчики учитывают все записи.</Typography>
    <Card><TableContainer tabIndex={0} role="region" aria-label="Прокручиваемый журнал посещений"><Table size="small" aria-label="Журнал посещений">
      <TableHead><TableRow>{['Событие', 'Посетитель / контакт', 'Источник', 'Страница', 'Дата · Душанбе'].map(title => <TableCell key={title}>{title}</TableCell>)}</TableRow></TableHead>
      <TableBody>{events.map(event => {
        const person = profiles.find(profile => profile.id === event.user_id)
        return <TableRow key={event.id}>
          <TableCell><Chip size="small" label={labels[event.event_type] || event.event_type} /></TableCell>
          <TableCell>
            <Typography sx={{ fontSize: '14px' }}>{person?.full_name || person?.email || 'Гость — личность неизвестна'}</Typography>
            {person?.phone && <Typography sx={{ fontSize: '12px', color: '#c4b8ab' }}>{person.phone} · из профиля</Typography>}
            {!person && <Typography sx={{ fontSize: '11px', color: '#c4b8ab' }}>Браузер: {event.visitor_id?.slice(0, 10) || 'не определён'}</Typography>}
          </TableCell>
          <TableCell>{sources[event.source] || event.source || 'Источник не передан'}</TableCell>
          <TableCell>{event.page_url}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(event.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' })}</TableCell>
        </TableRow>
      })}</TableBody>
    </Table></TableContainer></Card>
    {!loading && !error && events.length === 0 && <Typography>Событий по этому фильтру пока нет.</Typography>}
    <Stack direction="row" gap="12px" alignItems="center">
      <Button disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Назад</Button>
      <Typography sx={{ fontSize: '13px' }}>Страница {page + 1} · {total} событий</Typography>
      <Button disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(value => value + 1)}>Далее</Button>
    </Stack>
  </Stack>
}
