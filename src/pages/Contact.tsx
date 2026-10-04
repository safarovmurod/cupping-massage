import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import MuiButton from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { WhatsAppIcon, InstagramIcon, MapPinIcon, ClockIcon } from '../components/icons/Icons.tsx'
import { getWhatsAppLink } from '../components/layout/Header.tsx'
import { useLang } from '../contexts/LanguageContext.tsx'
import { supabase } from '../lib/supabase.ts'
import { validateLead } from '../lib/formValidation.ts'
import { trackWhatsAppClick, trackInstagramClick, trackFormSubmit } from '../lib/analytics.ts'

export default function Contact() {
  const { t, lang } = useLang()
  const [forWhom, setForWhom] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const submitting = useRef(false)
  const changeField = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }))
    setFieldErrors(previous => ({ ...previous, [field]: '' }))
  }
  const [form, setForm] = useState({ name: '', phone: '', time: '', comment: '' })
  // Ловушка для ботов: настоящий человек это поле не видит и не заполняет
  const [website, setWebsite] = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handleWA = (e) => {
    e.preventDefault()
    trackWhatsAppClick('contact')
    window.open(getWhatsAppLink(lang), '_blank', 'noopener,noreferrer')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    setError('')
    const errors = validateLead(form, forWhom)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      const field = Object.keys(errors)[0]
      document.getElementById(field === 'forWhom' ? 'contact-for-whom' : `contact-${field}`)?.focus()
      return
    }

    const name = form.name.trim()
    const phone = form.phone.trim()

    // Бот заполнил скрытое поле — тихо показываем успех, в базу ничего не пишем
    if (website) { setSubmitted(true); return }

    submitting.current = true
    setLoading(true)
    try {
      const { error: dbError } = await supabase.from('leads').insert({
        name: name.slice(0, 80),
        phone: phone.slice(0, 30),
        message: form.comment.trim().slice(0, 500) || null,
        preferred_time: form.time.trim().slice(0, 80) || null,
        for_whom: forWhom || null,
      })
      if (dbError) throw dbError
      trackFormSubmit({ forWhom })
      setSubmitted(true)
    } catch {
      setError(t('contact.form.err.send'))
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const yandexMapSrc = 'https://yandex.uz/map-widget/v1/?ll=68.786%2C38.536&z=15&pt=68.786,38.536,pm2rdm'
  const routeLink = 'https://maps.app.goo.gl/Z6nT8PEVyGF8H6a26?g_st=atm'

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(212,168,87,0.4)' },
      '&.Mui-focused fieldset': { borderColor: '#d4a857' },
    },
    '& .MuiInputLabel-root': { color: '#8a7f76' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#d4a857' },
  }

  return (
    <>
      <section className="pt-[120px] pb-8 text-center">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="section-title">
            <h1 className="gradient-text-animated text-3xl md:text-4xl font-bold">{t('contact.title')}</h1>
            <p className="mt-3 text-lg max-w-[600px] mx-auto">{t('contact.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column: info + map */}
            <div>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="glass-card !p-7 mb-5">
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-[42px] h-[42px] rounded-full bg-glass border border-gold-soft flex items-center justify-center text-gold shrink-0"><MapPinIcon width={22} height={22} /></div>
                  <div><div className="text-xs text-muted-soft uppercase tracking-wide">{t('contact.address.label')}</div><div className="text-base font-semibold">{t('contact.address.value')}</div></div>
                </div>
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-[42px] h-[42px] rounded-full bg-glass border border-gold-soft flex items-center justify-center text-gold shrink-0"><WhatsAppIcon size={22} /></div>
                  <div><div className="text-xs text-muted-soft uppercase tracking-wide">WhatsApp</div><div className="text-base font-semibold"><a href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer" onClick={handleWA}>+992 007 336 264</a></div></div>
                </div>
                <div className="flex items-start gap-3.5 mb-5">
                  <div className="w-[42px] h-[42px] rounded-full bg-glass border border-gold-soft flex items-center justify-center text-gold shrink-0"><InstagramIcon width={22} height={22} /></div>
                  <div><div className="text-xs text-muted-soft uppercase tracking-wide">Instagram</div><div className="text-base font-semibold"><a href="https://www.instagram.com/orom.massage.tj/" target="_blank" rel="noopener noreferrer" onClick={() => trackInstagramClick()}>@orom.massage.tj</a></div></div>
                </div>
                <motion.a href={getWhatsAppLink(lang)} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-primary btn-block mb-2.5" onClick={handleWA}><WhatsAppIcon size={18} /> Написать в WhatsApp</motion.a>
                <a href="https://www.instagram.com/orom.massage.tj/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-block" onClick={() => trackInstagramClick()}><InstagramIcon size={18} /> Открыть Instagram</a>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
                <div className="rounded-[28px] overflow-hidden shadow-card mb-4">
                  <iframe src={yandexMapSrc} title="Yandex Map — Zarafshon 22/1" loading="lazy" className="w-full border-none block" style={{ height: 340 }} />
                </div>
                <a href={routeLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-block">{t('contact.btn.route')}</a>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-card mt-5">
                <h3 className="text-lg font-semibold mb-3.5 flex items-center gap-2"><ClockIcon width={22} height={22} /> Часы работы</h3>
                <ul className="list-none"><li className="flex justify-between py-2 border-b border-glass-soft last:border-b-0 text-sm">{t('contact.hours.all')}</li></ul>
              </motion.div>
            </div>

            {/* Right column: form */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}>
              <div className="glass-card !p-8">
                <AnimatePresence mode="wait">
                  {!submitted ? (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h3 className="text-lg font-semibold mb-1.5">{t('contact.form.title')}</h3>
                      <p className="text-sm mb-5">{t('contact.form.subtitle')}</p>
                      <Box component="form" aria-busy={loading} noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField id="contact-name" disabled={loading} error={!!fieldErrors.name} helperText={fieldErrors.name ? t(fieldErrors.name) : undefined} inputProps={{ maxLength: 80 }} name="name" label={t('contact.form.name')} required autoComplete="name" value={form.name} onChange={e => changeField("name", e.target.value)} sx={inputSx} />
                        <TextField id="contact-phone" disabled={loading} error={!!fieldErrors.phone} helperText={fieldErrors.phone ? t(fieldErrors.phone) : undefined} inputProps={{ maxLength: 30 }} name="phone" label={t('contact.form.phone')} required type="tel" autoComplete="tel" value={form.phone} onChange={e => changeField("phone", e.target.value)} sx={inputSx} />
                        <TextField id="contact-time" disabled={loading} error={!!fieldErrors.time} helperText={fieldErrors.time ? t(fieldErrors.time) : undefined} inputProps={{ maxLength: 80 }} name="time" label={t('contact.form.time')} value={form.time} onChange={e => changeField("time", e.target.value)} sx={inputSx} />
                        <TextField disabled={loading} error={!!fieldErrors.forWhom} helperText={fieldErrors.forWhom ? t(fieldErrors.forWhom) : undefined} id="contact-for-whom" name="for_whom" select label={t('contact.form.forWhom')} required value={forWhom} onChange={e => { setForWhom(e.target.value); setFieldErrors(previous => ({ ...previous, forWhom: '' })) }} sx={inputSx} SelectProps={{ inputProps: { id: 'contact-for-whom', name: 'for_whom' } }}>
                          <MenuItem value="">—</MenuItem>
                          <MenuItem value="woman">{t('contact.form.forWhom.woman')}</MenuItem>
                          <MenuItem value="child">{t('contact.form.forWhom.child')}</MenuItem>
                        </TextField>
                        {forWhom === 'child' && <Typography sx={{ fontSize: '0.82rem', color: '#d4a857', bgcolor: 'rgba(212,168,87,0.1)', p: 1, borderRadius: 1 }}>{t('contact.form.childNote')}</Typography>}
                        <TextField id="contact-comment" disabled={loading} error={!!fieldErrors.comment} helperText={fieldErrors.comment ? t(fieldErrors.comment) : undefined} inputProps={{ maxLength: 500 }} name="comment" label={t('contact.form.comment')} multiline minRows={3} value={form.comment} onChange={e => changeField("comment", e.target.value)} sx={inputSx} />
                        <input
                          type="text" id="contact-website" name="website"
                          value={website} onChange={e => setWebsite(e.target.value)}
                          tabIndex={-1} autoComplete="off" style={{ display: 'none' }} aria-hidden="true"
                        />
                        {error && <Alert severity="error">{error}</Alert>}
                        <MuiButton
                          aria-label={t('contact.form.submit')} type="submit" variant="contained" size="large" disabled={loading}
                          sx={{
                            background: 'linear-gradient(135deg, #d4a857, #e8915a)', fontWeight: 600, borderRadius: '999px', py: 1.5,
                            '&:hover': { background: 'linear-gradient(135deg, #e8c178, #e8915a)' },
                            '&.Mui-disabled': { background: 'linear-gradient(135deg, rgba(212,168,87,0.5), rgba(232,145,90,0.5))', color: 'rgba(255,255,255,0.7)' },
                          }}
                        >
                          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t('contact.form.submit')}
                        </MuiButton>
                      </Box>
                    </motion.div>
                  ) : (
                    <motion.div key="success" role="status" aria-live="polite" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-7 rounded-[20px]" style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="text-4xl mb-3" style={{ color: '#25D366' }}>✓</motion.div>
                      <h3 className="text-[#25D366] mb-1.5">{t('contact.form.success.title')}</h3>
                      <p>{t('contact.form.success')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
