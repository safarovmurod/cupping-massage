import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
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
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import { supabase } from '../../lib/supabase.ts'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(212,168,87,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#d4a857' },
  },
}

export default function AdminLeads() {
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setLeads(data || [])
    } catch {
      setErrorMessage('Не удалось загрузить заявки. Обновите страницу и повторите попытку.')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    setErrorMessage('')
    try {
      const { error } = await supabase.from('leads').update({ status }).eq('id', id)
      if (error) throw error
      setLeads(previous => previous.map(l => l.id === id ? { ...l, status } : l))
    } catch {
      setErrorMessage('Статус не сохранён. Проверьте соединение и повторите попытку.')
    }
  }

  const filtered = leads.filter(l => {
    const matchSearch = l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search)
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    return matchSearch && matchStatus
  })

  if (loading) return <Typography sx={{ textAlign: 'center', py: 6, color: '#8a7f76' }}>Загрузка заявок…</Typography>

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {errorMessage && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{errorMessage}</Alert>}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField label="Поиск по имени или телефону" value={search} onChange={e => setSearch(e.target.value)} sx={{ ...inputSx, maxWidth: 400 }} />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} size="small" sx={{ ...inputSx, maxWidth: 200, minWidth: 150 }}>
          <MenuItem value="all">Все</MenuItem>
          <MenuItem value="new">Новые</MenuItem>
          <MenuItem value="in_progress">В работе</MenuItem>
          <MenuItem value="completed">Завершённые</MenuItem>
        </Select>
      </Box>
      {filtered.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 6, color: '#8a7f76' }}>Заявок пока нет</Typography>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ color: '#8a7f76', fontWeight: 600 }}>Имя</TableCell>
                  <TableCell sx={{ color: '#8a7f76', fontWeight: 600 }}>Телефон</TableCell>
                  <TableCell sx={{ color: '#8a7f76', fontWeight: 600 }}>Комментарий</TableCell>
                  <TableCell sx={{ color: '#8a7f76', fontWeight: 600 }}>Дата</TableCell>
                  <TableCell sx={{ color: '#8a7f76', fontWeight: 600 }}>Статус</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(l => (
                    <TableRow key={l.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.03)' } }}>
                      <TableCell>{l.name}</TableCell>
                      <TableCell>{l.phone}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.message || '—'}</TableCell>
                      <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select value={l.status} onChange={e => updateStatus(l.id, e.target.value)} size="small" sx={{ ...inputSx, minWidth: 130, fontSize: '0.8rem' }}>
                          <MenuItem value="new">Новые</MenuItem>
                          <MenuItem value="in_progress">В работе</MenuItem>
                          <MenuItem value="completed">Завершённые</MenuItem>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
