import { isValidEmail } from '../lib/formValidation.ts'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TextField from '@mui/material/TextField'
import MuiButton from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { useLang } from '../contexts/LanguageContext.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import PasswordField from '../components/common/PasswordField.tsx'
import GoogleButton from '../components/common/GoogleButton.tsx'
import { isSupabaseConfigured } from '../lib/supabase.ts'
import { translateAuthError } from '../lib/authErrors.ts'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(226,174,192,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#e2aec0' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e2aec0' },
}

// Клиента после входа ведём на сайт, администратора — в админку
function homeFor(role) {
  return role === 'admin' ? '/admin' : '/'
}

export default function Login() {
  const submitting = useRef(false)
  const { t } = useLang()
  const { signIn, user, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Если человек уже вошёл (например, через Google) и открыл /login
  useEffect(() => {
    if (user && profile) navigate(homeFor(profile.role), { replace: true })
  }, [user, profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    setError('')
    if (!isValidEmail(email)) { setError(t('auth.error.invalidEmail')); document.getElementById('login-email')?.focus(); return }
    submitting.current = true; setLoading(true)
    try {
      const result = await signIn(email, password)
      navigate(homeFor(result?.role))
    } catch (err) {
      setError(translateAuthError(err, t))
    } finally {
      submitting.current = false; setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundImage: 'linear-gradient(180deg, #211924 0%, #302333 50%, #211924 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] p-10 max-w-[440px] w-full backdrop-blur-xl border border-glass-soft shadow-card"
        style={{ background: 'var(--bg-card)' }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="text-3xl font-bold text-center mb-2 gradient-text"
        >{t('auth.login')}</motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-sm text-muted-soft text-center mb-7"
        >{t('auth.login.subtitle')}</motion.p>

        <AnimatePresence>
          {!isSupabaseConfigured() && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Alert severity="error" sx={{ mb: 2 }}>{t('auth.error.notConfigured')}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GoogleButton label={t('auth.google')} onError={(err) => setError(translateAuthError(err, t))} />
          <Divider sx={{ borderColor: 'rgba(226,174,192,0.2)', my: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#8a7f76', px: 1 }}>{t('auth.or')}</Typography>
          </Divider>
        </motion.div>

        <Box component="form" aria-busy={loading} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <TextField id="login-email" name="email" label={t('auth.email')} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} sx={inputSx} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <PasswordField
              id="login-password" name="password"
              label={t('auth.password')} autoComplete="current-password" required
              value={password} onChange={e => setPassword(e.target.value)}
              showLabel={t('auth.password.show')} hideLabel={t('auth.password.hide')}
            />
          </motion.div>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Alert severity="error">{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <MuiButton
              aria-label={t('auth.login.btn')} type="submit" fullWidth variant="contained" disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #8b4660, #74374f)', fontWeight: 600, borderRadius: '999px', py: 1.5,
                transition: 'all 0.3s ease',
                '&:hover': { background: 'linear-gradient(135deg, #a35c78, #74374f)', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(226,174,192,0.35)' },
                '&.Mui-disabled': { background: 'linear-gradient(135deg, rgba(226,174,192,0.5), rgba(185,105,136,0.5))', color: 'rgba(255,255,255,0.7)' },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('auth.login.btn')}
            </MuiButton>
          </motion.div>
        </Box>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="flex flex-col gap-2.5 mt-5 text-center">
          <Link to="/forgot-password" className="text-sm">{t('auth.forgot')}</Link>
          <Link to="/register" className="text-sm">{t('auth.no.account')}</Link>
        </motion.div>
        <Link to="/" className="block text-center mt-4 text-sm">{t('auth.back.home')}</Link>
      </motion.div>
    </div>
  )
}
