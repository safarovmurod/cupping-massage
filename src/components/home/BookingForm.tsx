import { useEffect, useRef, useState, type FormEvent } from 'react'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { useLang } from '../../contexts/LanguageContext.tsx'
import { bookingCopy, type BookingLanguage } from '../../lib/booking-copy.ts'
import { buildBookingMessage, getWhatsAppBookingUrl, INSTAGRAM_BOOKING_URL, validateBooking, type BookingService, type BookingValues } from '../../lib/booking.ts'

interface Props { services: BookingService[]; selectedService?: string; onServiceChange?: (service: string) => void }
const fieldStyle = {
  '& .MuiInputBase-root': { color: '#30242e', background: '#fffdfb', borderRadius: '12px' },
  '& .MuiInputLabel-root, & .MuiFormHelperText-root': { color: '#62515b' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#8b4660' },
  '& .MuiFormHelperText-root.Mui-error': { color: '#b32f49' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccb1ba' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b4660' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b4660', borderWidth: 2 },
}

export default function BookingForm({ services, selectedService, onServiceChange }: Props) {
  const { lang } = useLang()
  const language: BookingLanguage = lang === 'tj' || lang === 'en' ? lang : 'ru'
  const copy = bookingCopy[language]
  const [values, setValues] = useState<BookingValues>({
    name: '', phone: '', service: selectedService || '', forWhom: '', childAge: '',
    preferredDay: '', time: '', note: '', channel: 'whatsapp',
  })
  const [showErrors, setShowErrors] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState('')
  const [copyFailed, setCopyFailed] = useState(false)
  const [awaitingSend, setAwaitingSend] = useState(false)
  const preview = useRef<HTMLTextAreaElement>(null)
  const validation = validateBooking(values, services, language)
  const valid = Object.keys(validation).length === 0
  const message = valid ? buildBookingMessage(values, services, language) : ''
  const errors = showErrors ? validation : {}
  const copied = Boolean(message && copiedMessage === message && values.channel === 'instagram')

  useEffect(() => {
    if (selectedService) {
      setValues(previous => ({ ...previous, service: selectedService }))
      setCopiedMessage('')
      setCopyFailed(false)
      setAwaitingSend(false)
    }
  }, [selectedService])

  function editField(field: keyof BookingValues, value: string) {
    setValues(previous => ({ ...previous, [field]: value }))
    if (field === 'service') onServiceChange?.(value)
    setCopiedMessage('')
    setCopyFailed(false)
    setAwaitingSend(false)
  }

  function selectMessage() {
    preview.current?.focus()
    preview.current?.select()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (copying || !valid || !event.currentTarget.reportValidity()) return
    if (values.channel === 'whatsapp') {
      setAwaitingSend(true)
      window.location.assign(getWhatsAppBookingUrl(message))
      return
    }
    setCopyFailed(false)
    setCopiedMessage('')
    setCopying(true)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(message)
      setCopiedMessage(message)
    } catch {
      setCopyFailed(true)
      selectMessage()
      return
    } finally {
      setCopying(false)
    }
    window.location.assign(INSTAGRAM_BOOKING_URL)
  }

  return (
    <section className="mm-form-card" aria-labelledby="booking-title">
      <h2 id="booking-title">{copy.title}</h2>
      <p>{copy.description}</p>
      <form onSubmit={submit} className="mm-form" aria-busy={copying}>
        <fieldset disabled={copying} className="mm-form-grid" style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <TextField id="booking-name" name="name" label={copy.name} value={values.name} onChange={event => editField('name', event.target.value)}
            required error={!!errors.name} helperText={errors.name} inputProps={{ minLength: 2, maxLength: 80, autoComplete: 'name' }} sx={fieldStyle} />
          <TextField id="booking-phone" name="phone" type="tel" label={copy.phone} value={values.phone} onChange={event => editField('phone', event.target.value)}
            required error={!!errors.phone} helperText={errors.phone} inputProps={{ minLength: 9, maxLength: 30, autoComplete: 'tel', inputMode: 'tel' }} sx={fieldStyle} />
          <TextField id="booking-service" name="service" select label={copy.service} value={values.service} onChange={event => editField('service', event.target.value)}
            required error={!!errors.service} helperText={errors.service} sx={fieldStyle}
            SelectProps={{ MenuProps: { PaperProps: { sx: { background: '#fffdfb', color: '#30242e' } } } }}>
            {services.map(service => <MenuItem key={service.id} value={service.id}>{service.title}</MenuItem>)}
          </TextField>
          <TextField id="booking-recipient" name="forWhom" select label={copy.recipient} value={values.forWhom} onChange={event => editField('forWhom', event.target.value)}
            required error={!!errors.forWhom} helperText={errors.forWhom} sx={fieldStyle}
            SelectProps={{ MenuProps: { PaperProps: { sx: { background: '#fffdfb', color: '#30242e' } } } }}>
            <MenuItem value="woman">{copy.woman}</MenuItem><MenuItem value="child">{copy.child}</MenuItem>
          </TextField>
          {values.forWhom === 'child' && <TextField id="booking-child-age" name="childAge" label={copy.childAge} value={values.childAge}
            onChange={event => editField('childAge', event.target.value)} required error={!!errors.childAge} helperText={errors.childAge || copy.childAgeHint}
            inputProps={{ maxLength: 40 }} sx={fieldStyle} />}
          <TextField id="booking-day" name="preferredDay" type="date" label={copy.day} value={values.preferredDay} onChange={event => editField('preferredDay', event.target.value)}
            required error={!!errors.preferredDay} helperText={errors.preferredDay} InputLabelProps={{ shrink: true }} sx={fieldStyle} />
          <TextField id="booking-time" name="time" type="time" label={copy.time} value={values.time} onChange={event => editField('time', event.target.value)}
            error={!!errors.time} helperText={errors.time} InputLabelProps={{ shrink: true }} sx={fieldStyle} />
          <TextField id="booking-note" name="note" className="mm-field-wide" label={copy.note} value={values.note} onChange={event => editField('note', event.target.value)}
            multiline minRows={3} error={!!errors.note} helperText={errors.note} inputProps={{ maxLength: 500 }} sx={fieldStyle} />
          <fieldset className="mm-channel-grid mm-field-wide">
            <legend>{copy.channel}</legend>
            <label><input type="radio" name="booking-channel" value="whatsapp" checked={values.channel === 'whatsapp'} onChange={() => editField('channel', 'whatsapp')} required /> {copy.whatsapp}</label>
            <label><input type="radio" name="booking-channel" value="instagram" checked={values.channel === 'instagram'} onChange={() => editField('channel', 'instagram')} /> {copy.instagram}</label>
          </fieldset>
          <button type="submit" className="mm-btn mm-btn-primary mm-field-wide" disabled={copying}>
            {copying ? copy.copying : values.channel === 'whatsapp' ? copy.whatsappAction : copy.instagramAction}
          </button>
        </fieldset>
        {message && <TextField id="booking-preview" className="mm-message-preview" label={copy.preview} value={message} multiline minRows={7} maxRows={14}
          helperText={copy.previewHint} InputProps={{ readOnly: true }} inputRef={preview} sx={fieldStyle} />}
        {awaitingSend && <p role="status" className="mm-form-notice">{copy.awaitingSend}</p>}
        {copied && <>
          <p role="status" className="mm-form-notice">{copy.copied}</p>
          <a className="mm-btn mm-btn-outline" href={INSTAGRAM_BOOKING_URL}>{copy.openInstagram}</a>
        </>}
        {copyFailed && <>
          <p role="alert" className="mm-form-notice">{copy.copyFailed}</p>
          <button type="button" className="mm-btn mm-btn-outline" onClick={selectMessage}>{copy.selectMessage}</button>
          <a className="mm-btn mm-btn-outline" href={INSTAGRAM_BOOKING_URL}>{copy.openInstagram}</a>
        </>}
      </form>
    </section>
  )
}
