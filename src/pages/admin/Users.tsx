import { generateSecurePassword } from '../../lib/password.ts'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MuiButton from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import LockResetIcon from '@mui/icons-material/LockReset'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import { isStrongPassword } from '../../lib/password.ts'
import CleaningIcon from '@mui/icons-material/CleaningServices'
import { supabase } from '../../lib/supabase.ts'
import PasswordField from '../../components/common/PasswordField.tsx'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(226,174,192,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#e2aec0' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e2aec0' },
}

const ACTION_LABELS = {
  register: 'Регистрация',
  login: 'Вход в систему',
  logout: 'Выход',
  profile_update: 'Изменение профиля',
  password_reset: 'Сброс пароля',
  password_reset_by_admin: 'Пароль изменён админом',
  whatsapp_click: 'Клик по WhatsApp',
  page_view: 'Просмотр страницы',
  lead_submit: 'Отправка заявки',
}

const GENDERS = { male: 'Мужской', female: 'Женский', other: 'Другой' }

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

const fmtDateOnly = (d) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const age = (birth) => {
  if (!birth) return null
  const b = new Date(birth), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  const m = n.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--
  return a
}

/** Строка «поле: значение» в карточке */
function InfoRow({ label, value, mono = false }) {
  const empty = value === null || value === undefined || value === '' || value === '—'
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
      gap: 0.8, py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <Typography sx={{ fontSize: '0.82rem', color: '#8a7f76' }}>{label}</Typography>
      <Typography sx={{
        fontSize: '0.88rem',
        color: empty ? '#6b6058' : '#f5ede4',
        fontStyle: empty ? 'italic' : 'normal',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-word',
      }}>
        {empty ? 'не указано' : value}
      </Typography>
    </Box>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Карточка пользователя
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [tab, setTab] = useState(0)

  // Сброс пароля
  const [pwdDialog, setPwdDialog] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  // Удаление
  const [delTarget, setDelTarget] = useState(null)   // пользователь на удаление
  const [delBusy, setDelBusy] = useState(false)
  const [cleanDialog, setCleanDialog] = useState(false)
  const [cleanBusy, setCleanBusy] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles').select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (e) {
      setToast({ type: 'error', msg: `Ошибка загрузки: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }

  async function openDetails(user) {
    setSelected(user); setTab(0); setDetails(null); setDetailsLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_get_user_details', { target_user_id: user.id })
      if (error) throw error
      setDetails(data)
    } catch (e) {
      setToast({ type: 'error', msg: `Не удалось загрузить детали: ${e.message}` })
    } finally {
      setDetailsLoading(false)
    }
  }

  async function toggleActive(user) {
    const next = !user.is_active
    try {
      const { error } = await supabase.from('profiles')
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: next } : u)))
      setSelected((prev) => (prev && prev.id === user.id ? { ...prev, is_active: next } : prev))
      setToast({ type: 'success', msg: next ? 'Пользователь активирован' : 'Пользователь заблокирован' })
    } catch (e) {
      setToast({ type: 'error', msg: `Ошибка: ${e.message}` })
    }
  }

  async function resetPassword() {
    if (!isStrongPassword(newPwd)) { setToast({ type: 'error', msg: 'Минимум 8 символов: буквы A-Z, a-z и цифра' }); return }
    setPwdSaving(true)
    try {
      const { data, error } = await supabase.rpc('admin_set_user_password', {
        target_user_id: selected.id, new_password: newPwd,
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Не удалось изменить пароль')
      setToast({ type: 'success', msg: `Новый пароль установлен: ${newPwd} — передайте его клиенту` })
      setPwdDialog(false); setNewPwd('')
    } catch (e) {
      setToast({ type: 'error', msg: `Ошибка: ${e.message}` })
    } finally {
      setPwdSaving(false)
    }
  }

  // Удалить одного пользователя
  async function deleteUser() {
    if (!delTarget) return
    setDelBusy(true)
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: delTarget.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Не удалось удалить')
      setUsers((prev) => prev.filter((u) => u.id !== delTarget.id))
      setToast({ type: 'success', msg: `Пользователь ${data.email} удалён` })
      setDelTarget(null)
      setSelected(null)
    } catch (e) {
      setToast({ type: 'error', msg: `Ошибка: ${e.message}` })
    } finally {
      setDelBusy(false)
    }
  }

  // Удалить всех тестовых пользователей одной кнопкой
  async function cleanTestUsers() {
    setCleanBusy(true)
    try {
      const { data, error } = await supabase.rpc('admin_delete_test_users')
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Не удалось выполнить')
      if (data.deleted === 0) {
        setToast({ type: 'info', msg: 'Тестовых пользователей не найдено — всё чисто' })
      } else {
        setToast({ type: 'success', msg: `Удалено тестовых аккаунтов: ${data.deleted}` })
      }
      setCleanDialog(false)
      fetchUsers()
    } catch (e) {
      setToast({ type: 'error', msg: `Ошибка: ${e.message}` })
    } finally {
      setCleanBusy(false)
    }
  }

  const filtered = useMemo(() => users.filter((u) => {
    const q = search.toLowerCase()
    const hit = !q ||
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.phone?.includes(search) ||
      u.city?.toLowerCase().includes(q)
    const roleOk = roleFilter === 'all' || u.role === roleFilter
    return hit && roleOk
  }), [users, search, roleFilter])

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    blocked: users.filter((u) => u.is_active === false).length,
    filled: users.filter((u) => u.phone && u.city).length,
  }), [users])

  if (loading) {
    return <Typography sx={{ textAlign: 'center', py: 6, color: '#8a7f76' }}>Загрузка пользователей…</Typography>
  }

  const p = details?.profile || {}
  const a = details?.auth || {}

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Статистика */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2.5 }}>
        {[
          { label: 'Всего клиентов', value: stats.total, color: '#e2aec0' },
          { label: 'Администраторов', value: stats.admins, color: '#cf839e' },
          { label: 'Заблокировано', value: stats.blocked, color: '#ef5350' },
          { label: 'Профиль заполнен', value: stats.filled, color: '#25D366' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent sx={{ py: '14px !important' }}>
              <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#8a7f76' }}>{s.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Фильтры */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Поиск: имя, email, телефон, город…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" sx={{ ...inputSx, minWidth: 300, flex: 1, maxWidth: 420 }}
          InputProps={{ startAdornment: (
            <InputAdornment position="start"><SearchIcon sx={{ color: '#8a7f76', fontSize: 20 }} /></InputAdornment>
          )}}
        />
        <TextField select size="small" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ ...inputSx, minWidth: 160 }}>
          <MenuItem value="all">Все роли</MenuItem>
          <MenuItem value="user">Клиенты</MenuItem>
          <MenuItem value="admin">Администраторы</MenuItem>
        </TextField>

        {/* Удалить все тестовые аккаунты одной кнопкой */}
        <MuiButton
          variant="outlined" size="small" startIcon={<CleaningIcon sx={{ fontSize: 18 }} />}
          onClick={() => setCleanDialog(true)}
          sx={{
            borderColor: 'rgba(239,83,80,0.4)', color: '#ef5350', textTransform: 'none',
            borderRadius: '999px', px: 2, whiteSpace: 'nowrap',
            '&:hover': { borderColor: '#ef5350', background: 'rgba(239,83,80,0.08)' },
          }}
        >
          Удалить тестовые
        </MuiButton>
      </Box>

      {filtered.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 6, color: '#8a7f76' }}>Пользователи не найдены</Typography>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Клиент', 'Телефон', 'Город', 'Роль', 'Статус', 'Регистрация', ''].map((h) => (
                      <TableCell key={h} sx={{ color: '#8a7f76', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id} hover
                      sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(226,174,192,0.06)' } }}
                      onClick={() => openDetails(u)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar src={u.avatar_url || undefined}
                            sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#8b4660,#74374f)', fontSize: '0.85rem' }}>
                            {(u.full_name || u.email || '?')[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '0.88rem', color: '#f5ede4', fontWeight: 500 }}>
                              {u.full_name || '— без имени —'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#8a7f76' }}>{u.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#c4b8ab', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{u.phone || '—'}</TableCell>
                      <TableCell sx={{ color: '#c4b8ab', fontSize: '0.85rem' }}>{u.city || '—'}</TableCell>
                      <TableCell>
                        <Chip label={u.role === 'admin' ? 'Админ' : 'Клиент'} size="small"
                          sx={{
                            height: 22, fontSize: '0.72rem',
                            background: u.role === 'admin' ? 'linear-gradient(135deg,#8b4660,#74374f)' : 'rgba(255,255,255,0.08)',
                            color: u.role === 'admin' ? '#fff' : '#c4b8ab',
                          }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={u.is_active === false ? 'Заблокирован' : 'Активен'} size="small"
                          sx={{
                            height: 22, fontSize: '0.72rem',
                            background: u.is_active === false ? 'rgba(239,83,80,0.15)' : 'rgba(37,211,102,0.15)',
                            color: u.is_active === false ? '#ef5350' : '#25D366',
                          }} />
                      </TableCell>
                      <TableCell sx={{ color: '#8a7f76', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(u.created_at)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Полная информация">
                          <IconButton size="small" sx={{ color: '#e2aec0' }}
                            onClick={(e) => { e.stopPropagation(); openDetails(u) }}>
                            <VisibilityIcon sx={{ fontSize: 19 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.role === 'admin' ? 'Администратора удалять опасно' : 'Удалить пользователя'}>
                          <IconButton size="small"
                            sx={{ color: '#8a7f76', '&:hover': { color: '#ef5350', background: 'rgba(239,83,80,0.08)' } }}
                            onClick={(e) => { e.stopPropagation(); setDelTarget(u) }}>
                            <DeleteIcon sx={{ fontSize: 19 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ===== КАРТОЧКА КЛИЕНТА ===== */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: 'var(--admin-panel)', border: '1px solid rgba(226,174,192,0.25)', borderRadius: '18px' } }}>
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1.5 }}>
              <Avatar src={selected.avatar_url || undefined}
                sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b4660,#74374f)', fontSize: '1.4rem' }}>
                {(selected.full_name || selected.email || '?')[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5ede4' }}>
                  {selected.full_name || '— без имени —'}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#8a7f76' }}>{selected.email}</Typography>
              </Box>
              <Chip label={selected.is_active === false ? 'Заблокирован' : 'Активен'}
                sx={{
                  background: selected.is_active === false ? 'rgba(239,83,80,0.15)' : 'rgba(37,211,102,0.15)',
                  color: selected.is_active === false ? '#ef5350' : '#25D366', fontWeight: 600,
                }} />
            </DialogTitle>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
              px: 3, borderBottom: '1px solid rgba(255,255,255,0.08)',
              '& .MuiTab-root': { color: '#8a7f76', textTransform: 'none', fontWeight: 600, minHeight: 44 },
              '& .Mui-selected': { color: '#e2aec0 !important' },
              '& .MuiTabs-indicator': { background: '#e2aec0' },
            }}>
              <Tab label="Личные данные" />
              <Tab label="Аккаунт и доступ" />
              <Tab label={`История действий${details?.activity ? ` (${details.activity.length})` : ''}`} />
            </Tabs>

            <DialogContent sx={{ minHeight: 340 }}>
              {detailsLoading ? (
                <Typography sx={{ textAlign: 'center', py: 5, color: '#8a7f76' }}>Загрузка…</Typography>
              ) : (
                <>
                  {/* ЛИЧНЫЕ ДАННЫЕ */}
                  {tab === 0 && (
                    <Box>
                      <InfoRow label="Имя" value={p.first_name} />
                      <InfoRow label="Фамилия" value={p.last_name} />
                      <InfoRow label="Полное имя" value={p.full_name} />
                      <InfoRow label="Телефон" value={p.phone} />
                      <InfoRow label="Дата рождения"
                        value={p.birth_date ? `${fmtDateOnly(p.birth_date)} (${age(p.birth_date)} лет)` : null} />
                      <InfoRow label="Пол" value={GENDERS[p.gender] || p.gender} />
                      <InfoRow label="Национальность" value={p.nationality} />
                      <InfoRow label="Страна" value={p.country} />
                      <InfoRow label="Регион / область" value={p.region} />
                      <InfoRow label="Город" value={p.city} />
                      <InfoRow label="Адрес (местоположение)" value={p.address} />
                      <InfoRow label="Язык интерфейса" value={p.lang} />
                      <InfoRow label="Заметка администратора" value={p.notes} />
                      <InfoRow label="Заявок с этого телефона" value={details?.leads_count ?? 0} />
                    </Box>
                  )}

                  {/* АККАУНТ */}
                  {tab === 1 && (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <b>Пароль показать невозможно.</b> В базе он хранится не текстом, а в виде
                        необратимого bcrypt-хеша — расшифровать его нельзя технически (так работают
                        все безопасные системы). Если клиент забыл пароль — задайте новый кнопкой
                        «Сбросить пароль» и передайте его клиенту.
                      </Alert>

                      <InfoRow label="Email (логин)" value={a.email} mono />
                      <InfoRow label="Email подтверждён" value={a.email_confirmed ? 'Да' : 'Нет'} />
                      <InfoRow label="Пароль" value="•••••••• (bcrypt-хеш, не читается)" mono />
                      <InfoRow label="Роль" value={p.role === 'admin' ? 'Администратор' : 'Клиент'} />
                      <InfoRow label="Способ входа" value={a.provider} />
                      <InfoRow label="Дата регистрации" value={fmtDate(a.created_at)} />
                      <InfoRow label="Последний вход" value={fmtDate(a.last_sign_in_at)} />
                      <InfoRow label="Всего входов" value={p.login_count ?? 0} />
                      <InfoRow label="ID пользователя" value={selected.id} mono />

                      <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                      <FormControlLabel
                        control={
                          <Switch checked={selected.is_active !== false}
                            onChange={() => toggleActive(selected)}
                            sx={{ '& .Mui-checked': { color: '#25D366' },
                                  '& .Mui-checked + .MuiSwitch-track': { background: '#25D366 !important' } }} />
                        }
                        label={
                          <Typography sx={{ fontSize: '0.9rem', color: '#c4b8ab' }}>
                            Аккаунт активен {selected.is_active === false && '— клиент заблокирован'}
                          </Typography>
                        }
                      />

                      <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <MuiButton variant="outlined" startIcon={<LockResetIcon />}
                          onClick={() => setPwdDialog(true)}
                          sx={{ borderColor: 'rgba(226,174,192,0.4)', color: '#e2aec0', textTransform: 'none' }}>
                          Сбросить пароль
                        </MuiButton>
                        <MuiButton variant="outlined" startIcon={<DeleteIcon />}
                          onClick={() => setDelTarget(selected)}
                          sx={{ borderColor: 'rgba(239,83,80,0.4)', color: '#ef5350', textTransform: 'none',
                                '&:hover': { borderColor: '#ef5350', background: 'rgba(239,83,80,0.08)' } }}>
                          Удалить пользователя
                        </MuiButton>
                      </Box>
                    </Box>
                  )}

                  {/* ИСТОРИЯ */}
                  {tab === 2 && (
                    <Box>
                      {!details?.activity?.length ? (
                        <Typography sx={{ textAlign: 'center', py: 5, color: '#8a7f76' }}>
                          Действий пока нет
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {details.activity.map((ev, i) => (
                            <Box key={i} sx={{
                              display: 'flex', justifyContent: 'space-between', gap: 2,
                              p: 1.3, borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.88rem', color: '#f5ede4', fontWeight: 500 }}>
                                  {ACTION_LABELS[ev.action] || ev.action}
                                </Typography>
                                {ev.page_url && (
                                  <Typography sx={{ fontSize: '0.75rem', color: '#8a7f76' }}>{ev.page_url}</Typography>
                                )}
                              </Box>
                              <Typography sx={{ fontSize: '0.78rem', color: '#8a7f76', whiteSpace: 'nowrap' }}>
                                {fmtDate(ev.created_at)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                </>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <MuiButton onClick={() => setSelected(null)} sx={{ color: '#8a7f76', textTransform: 'none' }}>
                Закрыть
              </MuiButton>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ДИАЛОГ СБРОСА ПАРОЛЯ */}
      <Dialog open={pwdDialog} onClose={() => setPwdDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: 'var(--admin-panel)', border: '1px solid rgba(226,174,192,0.25)', borderRadius: '16px' } }}>
        <DialogTitle sx={{ color: '#f5ede4' }}>Новый пароль для клиента</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: '#8a7f76', mb: 2 }}>
            Клиент: <b style={{ color: '#c4b8ab' }}>{selected?.email}</b>
          </Typography>
          <TextField autoFocus fullWidth label="Новый пароль" value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)} sx={inputSx}
            helperText="Минимум 8 символов. Запишите и передайте клиенту — потом посмотреть будет нельзя."
            FormHelperTextProps={{ sx: { color: '#8a7f76' } }}
            InputProps={{ endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Сгенерировать">
                  <IconButton size="small" sx={{ color: '#e2aec0' }}
                    onClick={() => setNewPwd(generateSecurePassword())}>
                    <ContentCopyIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )}}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <MuiButton onClick={() => setPwdDialog(false)} sx={{ color: '#8a7f76', textTransform: 'none' }}>
            Отмена
          </MuiButton>
          <MuiButton variant="contained" onClick={resetPassword} disabled={pwdSaving || !isStrongPassword(newPwd)}
            sx={{ background: 'linear-gradient(135deg,#8b4660,#74374f)', fontWeight: 600, textTransform: 'none' }}>
            {pwdSaving ? 'Сохранение…' : 'Установить пароль'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* ДИАЛОГ: удалить одного пользователя */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: 'var(--admin-panel)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: '16px' } }}>
        <DialogTitle sx={{ color: '#f5ede4' }}>Удалить пользователя?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.88rem', color: '#c4b8ab', mb: 1 }}>
            {delTarget?.full_name || '— без имени —'}
          </Typography>
          <Typography sx={{ fontSize: '0.82rem', color: '#8a7f76', mb: 2 }}>
            {delTarget?.email}
          </Typography>
          <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
            Аккаунт, профиль и вся история действий будут удалены НАВСЕГДА.
            Отменить это действие невозможно.
          </Alert>
          {delTarget?.role === 'admin' && (
            <Alert severity="warning" sx={{ fontSize: '0.8rem', mt: 1.5 }}>
              Это администратор. Последнего админа система удалить не даст.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <MuiButton onClick={() => setDelTarget(null)} sx={{ color: '#8a7f76', textTransform: 'none' }}>
            Отмена
          </MuiButton>
          <MuiButton variant="contained" onClick={deleteUser} disabled={delBusy}
            startIcon={<DeleteIcon />}
            sx={{ background: '#ef5350', fontWeight: 600, textTransform: 'none', '&:hover': { background: '#d32f2f' } }}>
            {delBusy ? 'Удаление…' : 'Удалить навсегда'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* ДИАЛОГ: удалить все тестовые аккаунты */}
      <Dialog open={cleanDialog} onClose={() => setCleanDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: 'var(--admin-panel)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: '16px' } }}>
        <DialogTitle sx={{ color: '#f5ede4' }}>Удалить тестовые аккаунты?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: '#c4b8ab', mb: 2 }}>
            Будут удалены все аккаунты, чей email начинается с <b>test</b> — например
            <span style={{ color: '#e2aec0' }}> test1788198399@gmail.com</span>.
          </Typography>
          <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
            Администраторы и ваш собственный аккаунт НЕ будут затронуты. Реальные клиенты тоже в безопасности.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <MuiButton onClick={() => setCleanDialog(false)} sx={{ color: '#8a7f76', textTransform: 'none' }}>
            Отмена
          </MuiButton>
          <MuiButton variant="contained" onClick={cleanTestUsers} disabled={cleanBusy}
            startIcon={<CleaningIcon />}
            sx={{ background: '#ef5350', fontWeight: 600, textTransform: 'none', '&:hover': { background: '#d32f2f' } }}>
            {cleanBusy ? 'Очистка…' : 'Очистить'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={7000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast && <Alert severity={toast.type} onClose={() => setToast(null)}>{toast.msg}</Alert>}
      </Snackbar>
    </motion.div>
  )
}
