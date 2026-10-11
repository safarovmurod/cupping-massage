import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import Instagram from '@mui/icons-material/Instagram'
import { useLang } from '../contexts/LanguageContext.tsx'
import { INSTAGRAM_DM_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../lib/brand.ts'
import useBrandCopy from '../hooks/useBrandCopy.ts'
import { validateLead } from '../lib/formValidation.ts'
import { trackFormSubmit, trackInstagramClick } from '../lib/analytics.ts'
import { supabase } from '../lib/supabase.ts'
import './mama-malish.css'

const fieldStyle = {
  '& .MuiInputBase-root': { color: '#30242e', background: '#fffdfb', borderRadius: '12px' },
  '& .MuiInputLabel-root': { color: '#62515b' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#8b4660' },
  '& .MuiFormHelperText-root': { color: '#62515b' },
  '& .MuiFormHelperText-root.Mui-error': { color: '#b32f49' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccb1ba' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b4660' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b4660', borderWidth: 2 },
}

export default function Contact() {
  const { t } = useLang()
  const copy = useBrandCopy()
  const [form, setForm] = useState({ name: '', phone: '', time: '', comment: '' })
  const [forWhom, setForWhom] = useState('')
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [requestError, setRequestError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const busy = useRef(false)

  const editField = (field, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy.current) return
    setRequestError('')
    const found = validateLead(form, forWhom)
    setErrors(found)
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0]
      document.getElementById(first === 'forWhom' ? 'contact-for-whom' : 'contact-' + first)?.focus()
      return
    }
    // Accessible honeypot: ignore fake submissions without writing customer data.
    if (website) { setSent(true); return }
    busy.current = true
    setSending(true)
    try {
      const { error } = await supabase.from('leads').insert({
        name: form.name.trim().slice(0, 80),
        phone: form.phone.trim().slice(0, 30),
        message: form.comment.trim().slice(0, 500) || null,
        preferred_time: form.time.trim().slice(0, 80) || null,
        for_whom: forWhom,
      })
      if (error) throw error
      trackFormSubmit({ forWhom })
      setSent(true)
    } catch {
      // User-entered values remain in the form for an accessible retry.
      setRequestError(t('contact.form.err.send'))
    } finally {
      busy.current = false
      setSending(false)
    }
  }

  return (
    <div className="mm-site mm-contact-page">
      <section className="mm-section" aria-labelledby="mm-contact-page-title">
        <div className="mm-shell">
          <div className="mm-contact-form-grid">
            <div className="mm-contact-info">
              <span className="mm-kicker">{INSTAGRAM_HANDLE}</span>
              <h1 id="mm-contact-page-title">{copy.contactTitle}</h1>
              <p>{copy.contactLead}</p>
              <ol className="mm-contact-steps">{copy.bookingSteps.map(step => <li key={step}>{step}</li>)}</ol>
              <p className="mm-small-copy">{copy.safetyDisclaimer}</p>
              <a className="mm-btn mm-btn-outline" href={INSTAGRAM_DM_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackInstagramClick()}>
                <Instagram sx={{ fontSize: 20 }} aria-hidden="true" /> {copy.instagramButton}
              </a>
              <p className="mm-small-copy">{copy.contactsNote}</p>
              <a className="mm-contact-profile" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{copy.profileButton}</a>
              <p className="mm-back-link"><Link to="/#services">{copy.heroSecondary}</Link></p>
            </div>

            <div className="mm-form-card" aria-labelledby="mm-form-title">
              <h2 id="mm-form-title">{t('contact.form.title')}</h2>
              <p>{t('contact.form.subtitle')}</p>
              {sent ? (
                <div role="status" className="mm-form-success">
                  <CheckCircleOutlineRounded sx={{ fontSize: 36 }} aria-hidden="true" />
                  <h3>{t('contact.form.success.title')}</h3>
                  <p>{t('contact.form.success')}</p>
                </div>
              ) : (
                <form noValidate onSubmit={submit} className="mm-form" aria-busy={sending}>
                  <TextField id="contact-name" name="name" label={t('contact.form.name')} value={form.name} onChange={e => editField('name', e.target.value)}
                    disabled={sending} error={!!errors.name} helperText={errors.name && t(errors.name)} inputProps={{ maxLength: 80, autoComplete: 'name' }} sx={fieldStyle} required />
                  <TextField id="contact-phone" name="phone" type="tel" label={t('contact.form.phone')} value={form.phone} onChange={e => editField('phone', e.target.value)}
                    disabled={sending} error={!!errors.phone} helperText={errors.phone && t(errors.phone)} inputProps={{ maxLength: 30, autoComplete: 'tel', inputMode: 'tel' }} sx={fieldStyle} required />
                  <TextField id="contact-time" name="time" label={t('contact.form.time')} value={form.time} onChange={e => editField('time', e.target.value)}
                    disabled={sending} error={!!errors.time} helperText={errors.time && t(errors.time)} inputProps={{ maxLength: 80 }} sx={fieldStyle} />
                  <TextField id="contact-for-whom" name="forWhom" select label={t('contact.form.forWhom')} value={forWhom}
                    onChange={e => { setForWhom(e.target.value); setErrors(prev => ({ ...prev, forWhom: '' })) }}
                    disabled={sending} error={!!errors.forWhom} helperText={errors.forWhom && t(errors.forWhom)}
                    SelectProps={{ MenuProps: { PaperProps: { sx: { background: '#fffdfb', color: '#30242e' } } } }} sx={fieldStyle} required>
                    <MenuItem value="woman">{t('contact.form.forWhom.woman')}</MenuItem>
                    <MenuItem value="child">{t('contact.form.forWhom.child')}</MenuItem>
                  </TextField>
                  {forWhom === 'child' && <p className="mm-child-notice">{copy.safetyText}</p>}
                  <TextField id="contact-comment" name="comment" label={t('contact.form.comment')} value={form.comment} onChange={e => editField('comment', e.target.value)}
                    disabled={sending} error={!!errors.comment} helperText={errors.comment && t(errors.comment)}
                    multiline minRows={3} inputProps={{ maxLength: 500 }} sx={fieldStyle} />
                  <input type="text" id="contact-website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    value={website} onChange={e => setWebsite(e.target.value)} style={{ display: 'none' }} />
                  {requestError && <Alert severity="error" role="alert">{requestError}</Alert>}
                  <button className="mm-btn mm-btn-primary mm-form-submit" type="submit" disabled={sending}>
                    {sending && <CircularProgress size={18} sx={{ color: '#fff' }} />}
                    {t('contact.form.submit')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
