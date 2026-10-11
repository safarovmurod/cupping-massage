import { isValidEmail } from '../lib/formValidation.ts'
import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TextField from '@mui/material/TextField'
import MuiButton from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useLang } from '../contexts/LanguageContext.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import { supabase } from '../lib/supabase.ts'
import { WhatsAppIcon } from '../components/icons/Icons.tsx'
import PasswordField from '../components/common/PasswordField.tsx'
import { translateAuthError, translateResetCodeError } from '../lib/authErrors.ts'
import { passwordError } from '../lib/password.ts'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(226,174,192,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#e2aec0' },
  },
  '& .MuiInputLabel-root': { color: '#8a7f76' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e2aec0' },
}

const goldBtnSx = {
  background: 'linear-gradient(135deg, #8b4660, #74374f)', fontWeight: 600, borderRadius: '999px', py: 1.5,
  transition: 'all 0.3s ease',
  '&:hover': { background: 'linear-gradient(135deg, #a35c78, #74374f)', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(226,174,192,0.35)' },
  '&.Mui-disabled': { background: 'linear-gradient(135deg, rgba(226,174,192,0.5), rgba(185,105,136,0.5))', color: 'rgba(255,255,255,0.7)' },
}

function SuccessPanel({ text }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="text-center py-8 rounded-[20px]"
      style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
        className="mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </motion.div>
      <p className="px-6 text-sm" style={{ color: '#e5f9ee' }}>{text}</p>
    </motion.div>
  )
}

export default function ForgotPassword() {
  const submitting = useRef(false)
  const { t, s, lang } = useLang()
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState(0)

  // --- способ 1: ссылка на email ---
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // --- способ 2: код от администратора ---
  const [codeEmail, setCodeEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [codeStage, setCodeStage] = useState('request') // request | enter
  const [codeInfo, setCodeInfo] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeSuccess, setCodeSuccess] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)

  const waNumber = (s('whatsapp_number', '992007336264') || '992007336264').replace(/\D/g, '')

  const waLink = () => {
    const msg = t('auth.forgot.code.wa.msg').replace('{email}', codeEmail || email || '—')
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    setEmailError(''); setEmailSuccess('')
    if (!isValidEmail(email)) { setEmailError(t('auth.error.invalidEmail')); document.getElementById('forgot-email')?.focus(); return }
    submitting.current = true; setEmailLoading(true)
    try {
      await resetPassword(email)
      setEmailSuccess(t('auth.reset.sent'))
    } catch (err) {
      setEmailError(translateAuthError(err, t))
    } finally { submitting.current = false; setEmailLoading(false) }
  }

  // клиент оставляет заявку -> админ выдаёт код
  const handleRequestCode = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    setCodeError(''); setCodeInfo('')
    if (!isValidEmail(codeEmail)) { setCodeError(t('auth.error.invalidEmail')); document.getElementById('forgot-code-request-email')?.focus(); return }
    submitting.current = true; setCodeLoading(true)
    try {
      const { data, error } = await supabase.rpc('request_password_reset', {
        p_email: codeEmail.trim(), p_lang: lang,
      })
      if (error) throw error
      if (data?.ok) {
        setCodeInfo(t('auth.forgot.code.requested'))
        setCodeStage('enter')
      } else {
        setCodeError(translateResetCodeError(data?.error, t))
      }
    } catch (err) {
      setCodeError(translateAuthError(err, t))
    } finally { submitting.current = false; setCodeLoading(false) }
  }

  // клиент вводит код + новый пароль
  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    setCodeError(''); setCodeSuccess('')
    if (!isValidEmail(codeEmail)) { setCodeError(t('auth.error.invalidEmail')); document.getElementById('forgot-code-email')?.focus(); return }
    const passwordProblem = passwordError(newPwd)
    if (passwordProblem) { setCodeError(t(passwordProblem)); document.getElementById('forgot-new-password')?.focus(); return }
    if (newPwd !== confirmPwd) { setCodeError(t('auth.password.mismatch')); return }
    submitting.current = true; setCodeLoading(true)
    try {
      const { data, error } = await supabase.rpc('reset_password_with_code', {
        p_email: codeEmail.trim(), p_code: code, p_new_password: newPwd,
      })
      if (error) throw error
      if (data?.ok) {
        setCodeSuccess(t('auth.forgot.code.success'))
        setTimeout(() => navigate('/login'), 2500)
      } else {
        let msg = translateResetCodeError(data?.error, t)
        if (data?.error === 'bad_code' && typeof data?.left === 'number') {
          msg += ' ' + t('auth.forgot.err.attempts_left').replace('{n}', String(Math.max(0, data.left)))
        }
        setCodeError(msg)
      }
    } catch (err) {
      setCodeError(translateAuthError(err, t))
    } finally { submitting.current = false; setCodeLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundImage: 'linear-gradient(180deg, #211924 0%, #302333 50%, #211924 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] p-8 sm:p-10 max-w-[480px] w-full backdrop-blur-xl border border-glass-soft shadow-card my-8"
        style={{ background: 'var(--bg-card)' }}
      >
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-2xl sm:text-3xl font-bold text-center mb-2 gradient-text">{t('auth.forgot.title')}</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm text-muted-soft text-center mb-5">{t('auth.forgot.subtitle')}</motion.p>

        <Tabs
          value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth"
          sx={{
            mb: 3, minHeight: 40,
            '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #e2aec0, #b96988)', height: 3, borderRadius: 3 },
            '& .MuiTab-root': { color: '#8a7f76', fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', minHeight: 40, px: 1 },
            '& .Mui-selected': { color: '#e2aec0 !important' },
          }}
        >
          <Tab id="recovery-email-tab" aria-controls="recovery-email-panel" label={t('auth.forgot.tab.email')} />
          <Tab id="recovery-code-tab" aria-controls="recovery-code-panel" label={t('auth.forgot.tab.code')} />
        </Tabs>

        {/* ============ ВКЛАДКА 1: ссылка на email ============ */}
        {tab === 0 && (
          <motion.div key="tab-email" role="tabpanel" id="recovery-email-panel" aria-labelledby="recovery-email-tab" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <AnimatePresence mode="wait">
              {emailSuccess ? (
                <SuccessPanel key="ok" text={emailSuccess} />
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs text-muted-soft mb-3 leading-relaxed">{t('auth.forgot.email.hint')}</p>
                  <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.78rem', py: 0.5 }}>{t('auth.forgot.email.limit')}</Alert>
                  <Box component="form" aria-busy={emailLoading} onSubmit={handleEmailSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField id="forgot-email" name="email" label={t('auth.email')} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} sx={inputSx} />
                    <AnimatePresence mode="wait">
                      {emailError && (
                        <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                          <Alert severity="error">{emailError}</Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <MuiButton aria-label={t('auth.reset.btn')} type="submit" fullWidth variant="contained" disabled={emailLoading} sx={goldBtnSx}>
                      {emailLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('auth.reset.btn')}
                    </MuiButton>
                  </Box>
                  <button
                    type="button" onClick={() => { setCodeEmail(email); setTab(1) }}
                    className="w-full mt-3 text-xs text-center underline"
                    style={{ color: '#e2aec0', background: 'none', border: 'none', cursor: 'pointer' }}
                  >{t('auth.forgot.tab.code')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ============ ВКЛАДКА 2: код от администратора ============ */}
        {tab === 1 && (
          <motion.div key="tab-code" role="tabpanel" id="recovery-code-panel" aria-labelledby="recovery-code-tab" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            <AnimatePresence mode="wait">
              {codeSuccess ? (
                <SuccessPanel key="ok" text={codeSuccess} />
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs text-muted-soft mb-3 leading-relaxed">{t('auth.forgot.code.hint')}</p>

                  {/* шаг A: запросить код */}
                  {codeStage === 'request' && (
                    <Box component="form" aria-busy={codeLoading} onSubmit={handleRequestCode} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField id="forgot-code-request-email" name="email" label={t('auth.email')} type="email" autoComplete="email" required value={codeEmail} onChange={e => setCodeEmail(e.target.value)} sx={inputSx} />
                      <AnimatePresence mode="wait">
                        {codeError && (
                          <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            <Alert severity="error">{codeError}</Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <MuiButton aria-label={t('auth.forgot.code.request')} type="submit" fullWidth variant="contained" disabled={codeLoading} sx={goldBtnSx}>
                        {codeLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('auth.forgot.code.request')}
                      </MuiButton>
                      <button
                        type="button" onClick={() => setCodeStage('enter')}
                        className="text-xs text-center underline"
                        style={{ color: '#e2aec0', background: 'none', border: 'none', cursor: 'pointer' }}
                      >{t('auth.forgot.code.have')}</button>
                    </Box>
                  )}

                  {/* шаг B: ввести код и новый пароль */}
                  {codeStage === 'enter' && (
                    <Box component="form" aria-busy={codeLoading} onSubmit={handleCodeSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <AnimatePresence>
                        {codeInfo && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                            <Alert severity="success" sx={{ fontSize: '0.78rem', py: 0.5 }}>{codeInfo}</Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <MuiButton
                        component="a" href={waLink()} target="_blank" rel="noopener noreferrer"
                        fullWidth variant="outlined"
                        startIcon={<WhatsAppIcon size={18} />}
                        sx={{
                          borderRadius: '999px', py: 1.2, textTransform: 'none', fontWeight: 600,
                          borderColor: 'rgba(37,211,102,0.5)', color: '#25D366',
                          '&:hover': { borderColor: '#25D366', background: 'rgba(37,211,102,0.08)' },
                        }}
                      >{t('auth.forgot.code.whatsapp')}</MuiButton>

                      <TextField id="forgot-code-email" name="email" label={t('auth.email')} type="email" autoComplete="email" required value={codeEmail} onChange={e => setCodeEmail(e.target.value)} sx={inputSx} />
                      <TextField
                        id="forgot-code" name="code" autoComplete="one-time-code"
                        label={t('auth.forgot.code.label')} required value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6, style: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 } }}
                        sx={inputSx}
                      />
                      <PasswordField
                        error={!!codeError && !!passwordError(newPwd)} helperText={codeError && passwordError(newPwd) ? t(passwordError(newPwd)) : t('auth.password.hint')} id="forgot-new-password" name="new_password"
                        label={t('auth.password.new')} autoComplete="new-password" required
                        value={newPwd} onChange={e => setNewPwd(e.target.value)}
                        showLabel={t('auth.password.show')} hideLabel={t('auth.password.hide')}
                      />
                      <PasswordField
                        id="forgot-confirm-password" name="confirm_password"
                        label={t('auth.password.confirm')} autoComplete="new-password" required
                        value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                        showLabel={t('auth.password.show')} hideLabel={t('auth.password.hide')}
                      />

                      <AnimatePresence mode="wait">
                        {codeError && (
                          <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            <Alert severity="error">{codeError}</Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <MuiButton aria-label={t('auth.forgot.code.submit')} type="submit" fullWidth variant="contained" disabled={codeLoading} sx={goldBtnSx}>
                        {codeLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('auth.forgot.code.submit')}
                      </MuiButton>
                      <button
                        type="button" onClick={() => { setCodeStage('request'); setCodeError(''); setCodeInfo('') }}
                        className="text-xs text-center underline"
                        style={{ color: '#8a7f76', background: 'none', border: 'none', cursor: 'pointer' }}
                      >{t('auth.forgot.code.request')}</button>
                    </Box>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col gap-2.5 mt-5 text-center">
          <Link to="/login" className="text-sm">{t('auth.have.account')}</Link>
        </motion.div>
        <Link to="/" className="block text-center mt-4 text-sm">{t('auth.back.home')}</Link>
      </motion.div>
    </div>
  )
}
