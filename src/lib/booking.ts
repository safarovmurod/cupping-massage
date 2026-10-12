import { bookingCopy, type BookingLanguage } from './booking-copy.ts'

export interface BookingService { id: string; title: string }
export interface BookingValues {
  name: string
  phone: string
  service: string
  forWhom: '' | 'woman' | 'child'
  childAge: string
  preferredDay: string
  time: string
  note: string
  channel: 'whatsapp' | 'instagram'
}

export const INSTAGRAM_BOOKING_URL = 'https://ig.me/m/mama_i_malish_tj'
const WHATSAPP_BOOKING_URL = 'https://wa.me/992007336264'

function isValidDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(value + 'T12:00:00Z')
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

export function validateBooking(values: BookingValues, services: BookingService[], language: BookingLanguage = 'ru') {
  const copy = bookingCopy[language]
  const errors: Record<string, string> = {}
  const name = values.name.trim()
  const phone = values.phone.trim()
  const digits = phone.replace(/\D/g, '')
  if (name.length < 2 || values.name.length > 80) errors.name = copy.errors.name
  if (values.phone.length > 30 || !/^\+?[\d\s().-]+$/.test(phone) || digits.length < 9 || digits.length > 15) errors.phone = copy.errors.phone
  if (!services.some(item => item.id === values.service && item.title.trim())) errors.service = copy.errors.service
  if (!['woman', 'child'].includes(values.forWhom)) errors.forWhom = copy.errors.recipient
  if (values.service === 'cupping' && values.forWhom !== 'woman') errors.forWhom = copy.errors.adultsOnly
  if (values.forWhom === 'child' && (!values.childAge.trim() || values.childAge.length > 40)) errors.childAge = copy.errors.childAge
  if (!isValidDay(values.preferredDay)) errors.preferredDay = copy.errors.day
  if (values.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) errors.time = copy.errors.time
  if (values.note.length > 500) errors.note = copy.errors.note
  if (!['whatsapp', 'instagram'].includes(values.channel)) errors.channel = copy.errors.channel
  return errors
}

export function buildBookingMessage(values: BookingValues, services: BookingService[], language: BookingLanguage = 'ru') {
  const copy = bookingCopy[language]
  const service = services.find(item => item.id === values.service)
  const sections = [copy.intro]
  let recipient = ''
  if (values.forWhom === 'child') recipient = copy.child
  if (values.forWhom === 'woman') recipient = values.service === 'cupping' ? copy.adult : copy.woman
  const fields = [
    [copy.labels.name, values.name],
    [copy.labels.phone, values.phone],
    [copy.labels.service, service?.title || ''],
    [copy.labels.recipient, recipient],
    [copy.labels.childAge, values.forWhom === 'child' ? values.childAge : ''],
    [copy.labels.day, values.preferredDay],
    [copy.labels.time, values.time],
    [copy.labels.note, values.note],
  ]
  for (const [label, value] of fields) {
    if (value.trim()) sections.push(`${label}: ${value.trim()}`)
  }
  return sections.join('\n\n')
}

export function getWhatsAppBookingUrl(message: string) {
  return `${WHATSAPP_BOOKING_URL}?text=${encodeURIComponent(message)}`
}
