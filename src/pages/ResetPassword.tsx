import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TextField from '@mui/material/TextField'
import MuiButton from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useLang } from '../contexts/LanguageContext.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import { supabase } from '../lib/supabase.ts'
import PasswordField from '../components/common/PasswordField.tsx'
import { translateAuthError } from '../lib/authErrors.ts'
import { passwordError } from '../lib/password.ts'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(212,168,87,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#d4a857' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#d4a857' },
}

export default function ResetPassword() {
  const submitting = useRef(false)
  const { t } = useLang()
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)

  // The password-recovery link from Supabase sets a temporary session on this page.
  // We verify it exists before allowing a password change.
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        setValidSession(!error && !!data?.session)
        setChecking(false)
      }
    }).catch(() => {
      if (mounted) { setValidSession(false); setChecking(false) }
    })
    return () => { mounted = false }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current || !validSession) return
    setError(''); setSuccess('')
    const passwordProblem = passwordError(password)
    if (passwordProblem) { setError(t(passwordProblem)); document.getElementById('reset-password')?.focus(); return }
    if (password !== confirm) { setError(t('auth.password.mismatch')); return }
    submitting.current = true; setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(t('auth.password.success'))
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) { setError(translateAuthError(err, t)) } finally { submitting.current = false; setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundImage: 'linear-gradient(180deg, #1a1520 0%, #221c2a 50%, #1a1520 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] p-10 max-w-[440px] w-full backdrop-blur-xl border border-glass-soft shadow-card"
        style={{ background: 'var(--bg-card)' }}
      >
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-3xl font-bold text-center mb-2 gradient-text">{t('auth.reset.title')}</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm text-muted-soft text-center mb-7">{t('auth.reset.subtitle')}</motion.p>

        {checking ? (
          <div className="flex justify-center py-8"><CircularProgress size={28} sx={{ color: '#d4a857' }} /></div>
        ) : !validSession ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>{t('auth.error.expiredLink')}</Alert>
            <Link to="/forgot-password" className="block text-center mt-3 text-sm font-semibold">{t('auth.reset')}</Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" role="status" aria-live="polite" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center py-8 rounded-[20px]" style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}
              >
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
                  className="mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </motion.div>
                <p className="px-6 text-sm" style={{ color: '#e5f9ee' }}>{success}</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Box component="form" aria-busy={loading} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                    <PasswordField
                      helperText={t('auth.password.hint')} id="reset-password" name="password"
                      label={t('auth.password.new')} autoComplete="new-password" required
                      value={password} onChange={e => setPassword(e.target.value)}
                      showLabel={t('auth.password.show')} hideLabel={t('auth.password.hide')}
                    />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <PasswordField
                      id="reset-confirm-password" name="confirm_password"
                      label={t('auth.password.confirm')} autoComplete="new-password" required
                      value={confirm} onChange={e => setConfirm(e.target.value)}
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
                      aria-label={t('auth.password.save')} type="submit" fullWidth variant="contained" disabled={loading}
                      sx={{
                        background: 'linear-gradient(135deg, #d4a857, #e8915a)', fontWeight: 600, borderRadius: '999px', py: 1.5,
                        transition: 'all 0.3s ease',
                        '&:hover': { background: 'linear-gradient(135deg, #e8c178, #e8915a)', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(212,168,87,0.35)' },
                        '&.Mui-disabled': { background: 'linear-gradient(135deg, rgba(212,168,87,0.5), rgba(232,145,90,0.5))', color: 'rgba(255,255,255,0.7)' },
                      }}
                    >
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('auth.password.save')}
                    </MuiButton>
                  </motion.div>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="mt-5 text-center"><Link to="/login" className="text-sm">{t('auth.have.account')}</Link></div>
      </motion.div>
    </div>
  )
}
