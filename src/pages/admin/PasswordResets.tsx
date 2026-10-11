import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import MuiButton from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import RefreshIcon from '@mui/icons-material/Refresh'
import CopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import KeyIcon from '@mui/icons-material/VpnKey'
import WhatsAppMui from '@mui/icons-material/WhatsApp'
import { supabase } from '../../lib/supabase.ts'
import { useLang } from '../../contexts/LanguageContext.tsx'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f5ede4',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(226,174,192,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#e2aec0' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e2aec0' },
}

const STATUS = {
  pending:     { label: 'Ожидает кода',  color: '#cf839e', bg: 'rgba(207,131,158,0.15)' },
  code_issued: { label: 'Код выдан',     color: '#e2aec0', bg: 'rgba(226,174,192,0.15)' },
  used:        { label: 'Пароль изменён', color: '#25D366', bg: 'rgba(37,211,102,0.15)' },
  rejected:    { label: 'Отклонён / истёк', color: '#ef5350', bg: 'rgba(239,83,80,0.15)' },
}

const fmt = (d) => d ? new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

export default function PasswordResets() {
  const { s } = useLang()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const [manualEmail, setManualEmail] = useState('')
  const [manualBusy, setManualBusy] = useState(false)

  const waNumber = (s('whatsapp_number', '992007336264') || '992007336264').replace(/\D/g, '')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) setToast({ type: 'error', msg: 'Ошибка загрузки: ' + error.message })
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const issueCode = async (row) => {
    setBusyId(row.id)
    const { data, error } = await supabase.rpc('admin_issue_reset_code', { p_request_id: row.id })
    setBusyId(null)
    if (error) { setToast({ type: 'error', msg: error.message }); return }
    if (!data?.ok) { setToast({ type: 'error', msg: data?.error || 'Не удалось выдать код' }); return }
    setToast({ type: 'success', msg: `Код ${data.code} выдан. Передайте его клиенту в WhatsApp. Действует 30 минут.` })
    load()
  }

  const createForEmail = async (e) => {
    e.preventDefault()
    if (!manualEmail.trim()) return
    setManualBusy(true)
    const { data, error } = await supabase.rpc('admin_create_reset_code_for_email', { p_email: manualEmail.trim() })
    setManualBusy(false)
    if (error) { setToast({ type: 'error', msg: error.message }); return }
    if (!data?.ok) { setToast({ type: 'error', msg: data?.error || 'Ошибка' }); return }
    setToast({ type: 'success', msg: `Код для ${data.email}: ${data.code}. Действует 30 минут.` })
    setManualEmail('')
    load()
  }

  const removeRow = async (row) => {
    const { error } = await supabase.from('password_reset_requests').delete().eq('id', row.id)
    if (error) { setToast({ type: 'error', msg: error.message }); return }
    setRows(prev => prev.filter(r => r.id !== row.id))
  }

  const copy = (text) => {
    navigator.clipboard?.writeText(String(text))
    setToast({ type: 'success', msg: 'Скопировано: ' + text })
  }

  const waLink = (row) =>
    `https://wa.me/${waNumber}?text=${encodeURIComponent(
      `Здравствуйте! Ваш код для смены пароля на сайте: ${row.code}\nКод действует 30 минут.\nВведите его на странице «Забыли пароль?» → «По коду от администратора».`
    )}`

  const pendingCount = rows.filter(r => r.status === 'pending').length

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#f5ede4' }}>Запросы на сброс пароля</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#8a7f76', mt: 0.5 }}>
            Клиент нажимает «Забыли пароль?» → «По коду от администратора». Заявка появляется здесь.
            Вы выдаёте 6-значный код и отправляете его клиенту в WhatsApp.
          </Typography>
        </Box>
        <MuiButton onClick={load} startIcon={<RefreshIcon />} variant="outlined"
          sx={{ borderColor: 'rgba(226,174,192,0.4)', color: '#e2aec0', textTransform: 'none', borderRadius: '999px' }}>
          Обновить
        </MuiButton>
      </Box>

      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Новых заявок без кода: <b>{pendingCount}</b> — нажмите «Выдать код».
        </Alert>
      )}

      {/* Выдать код вручную по email */}
      <Card sx={{ background: 'var(--admin-panel)', border: '1px solid rgba(226,174,192,0.2)', borderRadius: '16px', mb: 3 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 600, color: '#f5ede4', mb: 0.5, fontSize: '0.95rem' }}>
            Выдать код сразу (без заявки)
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#8a7f76', mb: 2 }}>
            Если клиент позвонил или написал в WhatsApp — введите его email и получите код мгновенно.
          </Typography>
          <Box component="form" onSubmit={createForEmail}
            sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField size="small" label="Email клиента" type="email" value={manualEmail}
              onChange={e => setManualEmail(e.target.value)} sx={{ ...inputSx, minWidth: 260, flex: 1 }} />
            <MuiButton type="submit" variant="contained" disabled={manualBusy} startIcon={<KeyIcon />}
              sx={{ background: 'linear-gradient(135deg,#8b4660,#74374f)', fontWeight: 600, textTransform: 'none', borderRadius: '999px', px: 3, py: 1 }}>
              {manualBusy ? 'Создание…' : 'Создать код'}
            </MuiButton>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ background: 'var(--admin-panel)', border: '1px solid rgba(226,174,192,0.2)', borderRadius: '16px' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#e2aec0' }} />
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <Typography sx={{ color: '#8a7f76' }}>Заявок пока нет.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Email', 'Статус', 'Код', 'Создан', 'Действует до', 'Попытки', 'Действия'].map(h => (
                      <TableCell key={h} sx={{ color: '#8a7f76', fontWeight: 700, borderColor: 'rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const st = STATUS[row.status] || STATUS.pending
                    const expired = row.expires_at && new Date(row.expires_at) < new Date()
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ color: '#f5ede4', borderColor: 'rgba(255,255,255,0.07)' }}>
                          {row.email}
                          {row.note && (
                            <Typography sx={{ fontSize: '0.72rem', color: '#cf839e', mt: 0.3 }}>{row.note}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                          <Chip size="small" label={st.label}
                            sx={{ background: st.bg, color: st.color, fontWeight: 600, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                          {row.code ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#e2aec0', letterSpacing: '0.15em' }}>
                                {row.code}
                              </Typography>
                              <Tooltip title="Скопировать код">
                                <IconButton size="small" onClick={() => copy(row.code)} sx={{ color: '#8a7f76' }}>
                                  <CopyIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : <span style={{ color: '#5c5450' }}>—</span>}
                        </TableCell>
                        <TableCell sx={{ color: '#c4b8ab', borderColor: 'rgba(255,255,255,0.07)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(row.created_at)}</TableCell>
                        <TableCell sx={{ color: expired ? '#ef5350' : '#c4b8ab', borderColor: 'rgba(255,255,255,0.07)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {row.expires_at ? fmt(row.expires_at) : '—'}
                        </TableCell>
                        <TableCell sx={{ color: row.attempts > 0 ? '#cf839e' : '#c4b8ab', borderColor: 'rgba(255,255,255,0.07)' }}>{row.attempts}</TableCell>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            {row.status !== 'used' && (
                              <MuiButton size="small" variant="contained" disabled={busyId === row.id}
                                onClick={() => issueCode(row)} startIcon={<KeyIcon sx={{ fontSize: 15 }} />}
                                sx={{ background: 'linear-gradient(135deg,#8b4660,#74374f)', fontWeight: 600, textTransform: 'none', fontSize: '0.72rem', borderRadius: '999px', px: 1.5 }}>
                                {busyId === row.id ? '…' : row.code ? 'Новый код' : 'Выдать код'}
                              </MuiButton>
                            )}
                            {row.code && (
                              <Tooltip title="Отправить код в WhatsApp">
                                <IconButton size="small" component="a" href={waLink(row)} target="_blank" rel="noopener noreferrer"
                                  sx={{ color: '#25D366' }}>
                                  <WhatsAppMui sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Удалить заявку">
                              <IconButton size="small" onClick={() => removeRow(row)} sx={{ color: '#8a7f76', '&:hover': { color: '#ef5350' } }}>
                                <DeleteIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ borderColor: 'rgba(226,174,192,0.15)', my: 3 }} />
      <Typography sx={{ fontSize: '0.78rem', color: '#6e645d', lineHeight: 1.7 }}>
        Как это работает: клиент открывает <b>/forgot-password</b> → вкладка «По коду от администратора» → вводит свой email
        → заявка появляется в этой таблице. Вы нажимаете «Выдать код», затем зелёную кнопку WhatsApp — откроется чат
        с готовым текстом. Клиент вводит код и новый пароль на сайте. Код живёт 30 минут, допускается 5 попыток ввода.
      </Typography>

      <Snackbar open={!!toast} autoHideDuration={9000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.type || 'info'} onClose={() => setToast(null)} sx={{ maxWidth: 480 }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
