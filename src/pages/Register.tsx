import { isValidEmail } from '../lib/formValidation.ts'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TextField from '@mui/material/TextField'
import MuiButton from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { useLang } from '../contexts/LanguageContext.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import PasswordField from '../components/common/PasswordField.tsx'
import GoogleButton from '../components/common/GoogleButton.tsx'
import { trackAuthEvent } from '../lib/analytics.ts'
import { isSupabaseConfigured } from '../lib/supabase.ts'
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

export default function Register() {
  const submitting = useRef(false)
  const { t } = useLang()
  const { signUp, user, profile } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Дополнительные поля профиля
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [nationality, setNationality] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')

  // Уже вошедшего человека не держим на странице регистрации:
  // клиента отправляем на сайт, администратора — в админку
  useEffect(() => {
    if (user && profile) navigate(profile.role === 'admin' ? '/admin' : '/', { replace: true })
  }, [user, profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    setError(''); setSuccess('')
    if (!isValidEmail(email)) { setError(t('auth.error.invalidEmail')); document.getElementById('register-email')?.focus(); return }
    if (fullName.trim().length < 2) { setError(t('auth.error.invalidName')); document.getElementById('register-fullname')?.focus(); return }
    const passwordProblem = passwordError(password)
    if (passwordProblem) { setError(t(passwordProblem)); document.getElementById('register-password')?.focus(); return }
    submitting.current = true; setLoading(true)
    try {
      const composedName = fullName.trim() || [firstName, lastName].filter(Boolean).join(' ')
      await signUp(email, password, composedName, {
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        birth_date: birthDate || null,
        gender: gender || null,
        nationality: nationality || null,
        region: region || null,
        city: city || null,
        address: address || null,
      })
      trackAuthEvent('registration')
      setSuccess(t('auth.confirm'))
      setFullName(''); setEmail(''); setPassword('')
      setFirstName(''); setLastName(''); setPhone(''); setBirthDate('')
      setGender(''); setNationality(''); setRegion(''); setCity(''); setAddress('')
    } catch (err) {
      setError(translateAuthError(err, t))
    } finally {
      submitting.current = false; setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundImage: 'linear-gradient(180deg, #1a1520 0%, #221c2a 50%, #1a1520 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] p-10 max-w-[560px] w-full backdrop-blur-xl border border-glass-soft shadow-card my-8"
        style={{ background: 'var(--bg-card)' }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="text-3xl font-bold text-center mb-2 gradient-text"
        >{t('auth.register')}</motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-sm text-muted-soft text-center mb-7"
        >{t('auth.register.subtitle')}</motion.p>

        <AnimatePresence>
          {!isSupabaseConfigured() && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Alert severity="error" sx={{ mb: 2 }}>{t('auth.error.notConfigured')}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

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
              <Link to="/login" className="inline-block mt-4 text-sm font-semibold" style={{ color: '#25D366' }}>{t('auth.have.account')}</Link>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <GoogleButton label={t('auth.google')} onError={(err) => setError(translateAuthError(err, t))} />
                <Divider sx={{ borderColor: 'rgba(212,168,87,0.2)', my: 2.5 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#8a7f76', px: 1 }}>{t('auth.or')}</Typography>
                </Divider>
              </motion.div>
              <Box component="form" aria-busy={loading} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                  <TextField inputProps={{ maxLength: 80 }} id="register-fullname" name="name" label={t('auth.name')} autoComplete="name" required value={fullName} onChange={e => setFullName(e.target.value)} sx={inputSx} />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <TextField id="register-email" name="email" label={t('auth.email')} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} sx={inputSx} />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                  <PasswordField
                    error={!!error && !!passwordError(password)} helperText={error && passwordError(password) ? t(passwordError(password)) : t('auth.password.hint')} id="register-password" name="password"
                    label={t('auth.password')} autoComplete="new-password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    showLabel={t('auth.password.show')} hideLabel={t('auth.password.hide')}
                  />
                </motion.div>

                {/* ——— Дополнительная информация ——— */}
                <Divider sx={{ borderColor: 'rgba(212,168,87,0.2)', my: 0.5 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#8a7f76', px: 1, whiteSpace: 'normal', textAlign: 'center' }}>
                    {t('auth.extra.title')}
                  </Typography>
                </Divider>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField autoComplete="given-name" id="register-firstname" name="first_name" label={t('auth.firstName')} value={firstName}
                    onChange={e => setFirstName(e.target.value)} sx={inputSx} size="small" />
                  <TextField autoComplete="family-name" id="register-lastname" name="last_name" label={t('auth.lastName')} value={lastName}
                    onChange={e => setLastName(e.target.value)} sx={inputSx} size="small" />
                  <TextField autoComplete="tel" id="register-phone" name="phone" label={t('auth.phone')} type="tel" placeholder="+992 __ ___ __ __"
                    value={phone} onChange={e => setPhone(e.target.value)} sx={inputSx} size="small" />
                  <TextField autoComplete="bday" id="register-birthdate" name="birth_date" label={t('auth.birthDate')} type="date" value={birthDate}
                    onChange={e => setBirthDate(e.target.value)} sx={inputSx} size="small"
                    InputLabelProps={{ shrink: true }} />
                  <TextField id="register-gender" name="gender" label={t('auth.gender')} select value={gender}
                    onChange={e => setGender(e.target.value)} sx={inputSx} size="small">
                    <MenuItem value="">{t('auth.notSpecified')}</MenuItem>
                    <MenuItem value="female">{t('auth.gender.female')}</MenuItem>
                    <MenuItem value="male">{t('auth.gender.male')}</MenuItem>
                    <MenuItem value="other">{t('auth.gender.other')}</MenuItem>
                  </TextField>
                  <TextField id="register-nationality" name="nationality" label={t('auth.nationality')} value={nationality}
                    onChange={e => setNationality(e.target.value)} sx={inputSx} size="small" />
                  <TextField autoComplete="address-level1" id="register-region" name="region" label={t('auth.region')} value={region}
                    onChange={e => setRegion(e.target.value)} sx={inputSx} size="small" />
                  <TextField autoComplete="address-level2" id="register-city" name="city" label={t('auth.city')} value={city}
                    onChange={e => setCity(e.target.value)} sx={inputSx} size="small" />
                </Box>
                <TextField autoComplete="street-address" id="register-address" name="address" label={t('auth.address')} value={address}
                  onChange={e => setAddress(e.target.value)} sx={inputSx} size="small"
                  multiline minRows={2} />

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <Alert severity="error">{error}</Alert>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <MuiButton
                    aria-label={t('auth.register.btn')} type="submit" fullWidth variant="contained" disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #d4a857, #e8915a)', fontWeight: 600, borderRadius: '999px', py: 1.5,
                      transition: 'all 0.3s ease',
                      '&:hover': { background: 'linear-gradient(135deg, #e8c178, #e8915a)', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(212,168,87,0.35)' },
                      '&.Mui-disabled': { background: 'linear-gradient(135deg, rgba(212,168,87,0.5), rgba(232,145,90,0.5))', color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('auth.register.btn')}
                  </MuiButton>
                </motion.div>
              </Box>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col gap-2.5 mt-5 text-center">
                <Link to="/login" className="text-sm">{t('auth.have.account')}</Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <Link to="/" className="block text-center mt-4 text-sm">{t('auth.back.home')}</Link>
      </motion.div>
    </div>
  )
}
