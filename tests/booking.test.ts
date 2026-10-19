import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBookingMessage, getWhatsAppBookingUrl, INSTAGRAM_BOOKING_URL, validateBooking, type BookingValues } from '../src/lib/booking.ts'

const services = [{ id: 'synthetic-service', title: 'Synthetic massage' }]
const values: BookingValues = {
  name: 'Fictional Guest', phone: '+1 (202) 555-0123', service: 'synthetic-service',
  forWhom: 'woman', childAge: '', preferredDay: '2026-11-02', time: '', note: '', channel: 'whatsapp',
}

test('booking validates required inputs, known services, real calendar dates and child age', () => {
  assert.deepEqual(validateBooking(values, services), {})
  for (const [field, value] of Object.entries({ name: ' ', phone: 'call me', service: 'unknown', forWhom: '', preferredDay: '2026-02-30', time: '29:61' })) {
    assert.ok(validateBooking({ ...values, [field]: value }, services)[field], field)
  }
  assert.ok(validateBooking({ ...values, forWhom: 'child' }, services).childAge)
  assert.deepEqual(validateBooking({ ...values, forWhom: 'child', childAge: '6 months' }, services), {})
  assert.deepEqual(validateBooking({ ...values, preferredDay: '2028-02-29' }, services), {})
  assert.ok(validateBooking({ ...values, preferredDay: '2027-02-29' }, services).preferredDay)
  assert.ok(validateBooking({ ...values, note: 'a'.repeat(501) }, services).note)
  assert.ok(validateBooking({ ...values, name: 'a'.repeat(81) }, services).name)
  assert.ok(validateBooking({ ...values, phone: '1234567890123456' }, services).phone)
})

test('localized message has blank-line sections, omits empty optional fields and retains user line breaks', () => {
  const message = buildBookingMessage({ ...values, forWhom: 'child', childAge: '6 months', time: '10:30', note: 'First line\nSecond line & + ? # 🧡' }, services, 'en')
  assert.match(message, /Name: Fictional Guest\n\nPhone:/)
  assert.match(message, /Service: Synthetic massage/)
  assert.match(message, /Child’s age: 6 months/)
  assert.match(message, /Preferred date: 2026-11-02/)
  assert.match(message, /Comment: First line\nSecond line & \+ \? # 🧡/u)
  const short = buildBookingMessage({ ...values, childAge: 'unused', note: '   ' }, services, 'en')
  assert.doesNotMatch(short, /Child’s age:|Preferred time:|Comment:/)
  assert.match(buildBookingMessage(values, services, 'ru'), /Имя: Fictional Guest/)
  assert.match(buildBookingMessage(values, services, 'tj'), /Ном: Fictional Guest/)
})

test('cupping accepts only an adult; other service recipient choices stay unchanged', () => {
  const cuppingServices = [...services, { id: 'cupping', title: 'Synthetic cupping massage' }]
  assert.ok(validateBooking({ ...values, service: 'cupping', forWhom: 'child', childAge: '6 months' }, cuppingServices).forWhom)
  assert.deepEqual(validateBooking({ ...values, service: 'cupping' }, cuppingServices), {})
  assert.deepEqual(validateBooking({ ...values, service: 'cupping', childAge: 'unused previous age' }, cuppingServices), {})
  assert.deepEqual(validateBooking({ ...values, forWhom: 'child', childAge: '6 months' }, cuppingServices), {})
})

test('cupping drafts use the localized adult label and omit a previous child age', () => {
  const cuppingServices = [...services, { id: 'cupping', title: 'Synthetic cupping massage' }]
  for (const [language, recipient, childAgeLabel] of [
    ['ru', 'Для кого: Для взрослого', 'Возраст ребёнка:'],
    ['tj', 'Барои кӣ: Барои калонсол', 'Синни кӯдак:'],
    ['en', 'For: For an adult', 'Child’s age:'],
  ] as const) {
    const message = buildBookingMessage({ ...values, service: 'cupping', childAge: 'unused previous age' }, cuppingServices, language)
    assert.ok(message.includes(recipient), language)
    assert.ok(!message.includes(childAgeLabel) && !message.includes('unused previous age'), language)
  }
  assert.match(buildBookingMessage(values, cuppingServices, 'ru'), /Для кого: Для женщины/)
})

test('WhatsApp URL encodes the exact message and uses only the verified recipient; Instagram is a real Direct link', () => {
  const message = buildBookingMessage({ ...values, note: 'Line one\nLine two: + & ? # = / тоҷикӣ' }, services, 'tj')
  const url = new URL(getWhatsAppBookingUrl(message))
  assert.equal(url.origin, 'https://wa.me')
  assert.equal(url.pathname, '/992007336264')
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  assert.equal(url.searchParams.get('text'), message)
  assert.equal(url.hash, '')
  assert.equal(INSTAGRAM_BOOKING_URL, 'https://ig.me/m/mama_i_malish_tj')
})
