import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import MuiButton from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { supabase } from '../../lib/supabase.ts'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(226,174,192,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#e2aec0' },
  },
  '& .MuiInputLabel-root': { color: '#c8b8c4' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e2aec0' },
}

export default function AdminContacts() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    setLoading(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.from('site_settings').select('*')
      if (error) throw error
      const obj = {}
      ;(data || []).forEach(item => { obj[item.key] = item.value })
      setSettings(obj)
    } catch {
      setErrorMessage('Не удалось загрузить настройки. Повторите попытку позже.')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaved(false)
    setErrorMessage('')
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() })
        if (error) throw error
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setErrorMessage('Не удалось сохранить все настройки. Часть изменений могла сохраниться.')
    }
  }

  const fields = [
    { key: 'whatsapp_number', label: 'Номер WhatsApp' }, { key: 'instagram_url', label: 'Ссылка на Instagram' },
    { key: 'address', label: 'Адрес' }, { key: 'map_url', label: 'Ссылка на карту' },
    { key: 'working_hours_ru', label: 'Часы работы (RU)' }, { key: 'working_hours_tj', label: 'Часы работы (TJ)' },
    { key: 'working_hours_en', label: 'Часы работы (EN)' },
    { key: 'wa_msg_ru', label: 'Текст сообщения WhatsApp (RU)' }, { key: 'wa_msg_tj', label: 'Текст сообщения WhatsApp (TJ)' },
    { key: 'wa_msg_en', label: 'Текст сообщения WhatsApp (EN)' },
  ]

  if (loading) return <Typography sx={{ textAlign: 'center', py: 6, color: '#c8b8c4' }}>Загрузка настроек…</Typography>

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Контакты и ссылки</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {fields.map(f => (
              <Box key={f.key} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '200px 1fr' }, gap: 1.5, alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 500, color: '#c4b8ab' }}>{f.label}</Typography>
                <TextField value={settings[f.key] || ''} inputProps={{ 'aria-label': f.label }}
                  onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} sx={inputSx} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
      <MuiButton variant="contained" onClick={saveSettings} sx={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #8b4660, #74374f)', fontWeight: 600, borderRadius: '999px', px: 4 }}>Сохранить</MuiButton>
      {saved && <Alert severity="success">Сохранено!</Alert>}
      {errorMessage && <Alert severity="error" role="alert">{errorMessage}</Alert>}
    </motion.div>
  )
}
