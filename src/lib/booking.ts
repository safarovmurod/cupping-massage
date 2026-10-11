/** Customer-side booking helper. No personal details are saved in our database. */
export const WHATSAPP_NUMBER = '992007336264'

export type BookingLanguage = 'ru' | 'tj' | 'en'
export type BookingAudience = 'child' | 'adult'
export type BookingService = 'child_massage' | 'adult_massage' | 'cupping' | 'partial' | 'electro_child' | 'electro_adult' | 'light'
export type BodyZone = 'back' | 'neck' | 'arms' | 'legs' | 'other'

export interface BookingDraft {
  audience: BookingAudience
  service: BookingService
  name: string
  ageMonths?: string
  bodyZone?: BodyZone
  preferredDate?: string
  preferredTime?: string
  note?: string
}

export const SERVICE_IDS: Record<BookingAudience, BookingService[]> = {
  child: ['child_massage', 'electro_child', 'light'],
  adult: ['adult_massage', 'partial', 'cupping', 'electro_adult', 'light'],
}

const dictionary = {
  ru: {
    header: 'Здравствуйте! Хочу записаться в «Мама и малыш».',
    name: 'Имя', audience: 'Для кого', child: 'Для ребёнка', adult: 'Для себя',
    service: 'Услуга', age: 'Возраст ребёнка (месяцев)', zone: 'Одна зона',
    date: 'Желаемая дата', time: 'Удобное время', note: 'Пожелания',
    doctor: 'Для детского массажа необходимо разрешение врача и присутствие родителя.',
    services: ['Детский массаж — 700 сомони / 10 дней', 'Массаж всего тела — 1700 сомони / 10 дней',
      'Баночный массаж — 70 сомони', 'Одна зона массажа — 70 сомони',
      'Электрофорез для детей — 15 сомони / день', 'Электрофорез для взрослых — 20 сомони / день',
      'Светотерапия — цена по запросу'],
    zones: ['Спина', 'Шея и плечи', 'Руки', 'Ноги', 'Другая зона'],
  },
  tj: {
    header: 'Салом! Барои массаж дар «Мама и малыш» навбат гирифтан мехоҳам.',
    name: 'Ном', audience: 'Барои кӣ', child: 'Барои кӯдак', adult: 'Барои худ',
    service: 'Хизмат', age: 'Синну соли кӯдак (моҳ)', zone: 'Як қисми бадан',
    date: 'Рӯзи интихобшуда', time: 'Вақти қулай', note: 'Шарҳ',
    doctor: 'Барои массажи кӯдак иҷозати духтур ва ҳузури яке аз волидон ҳатмист.',
    services: ['Массажи кӯдакон — 700 сомонӣ / 10 рӯз', 'Массажи пурраи бадан — 1700 сомонӣ / 10 рӯз',
      'Массажи банкагӣ — 70 сомонӣ', 'Массажи як қисми бадан — 70 сомонӣ',
      'Электрофорез барои кӯдакон — 15 сомонӣ / рӯз', 'Электрофорез барои калонсолон — 20 сомонӣ / рӯз',
      'Светотерапия — нарх бо дархост'],
    zones: ['Пушт', 'Гардан ва китф', 'Дастҳо', 'Пойҳо', 'Қисми дигар'],
  },
  en: {
    header: 'Hello! I would like to book at Mama & Baby.',
    name: 'Name', audience: 'For', child: 'A child', adult: 'Myself',
    service: 'Service', age: 'Child age (months)', zone: 'One body area',
    date: 'Preferred date', time: 'Preferred time', note: 'Notes',
    doctor: 'Child massage requires a doctor’s permission and a parent present.',
    services: ['Child massage — 700 somoni / 10 days', 'Full-body massage — 1700 somoni / 10 days',
      'Cupping massage — 70 somoni', 'One body area — 70 somoni',
      'Electrophoresis for children — 15 somoni / day', 'Electrophoresis for adults — 20 somoni / day',
      'Light therapy — price on request'],
    zones: ['Back', 'Neck and shoulders', 'Arms', 'Legs', 'Other area'],
  },
} as const
const allIds: BookingService[] = ['child_massage','adult_massage','cupping','partial','electro_child','electro_adult','light']
const zoneIds: BodyZone[] = ['back','neck','arms','legs','other']
const clean = (value: string | undefined, limit = 160) => (value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, limit)

export function bookingServiceLabel(service: BookingService, language: BookingLanguage = 'ru') {
  return dictionary[language].services[allIds.indexOf(service)] || ''
}
export function bookingZoneLabel(zone: BodyZone, language: BookingLanguage = 'ru') {
  return dictionary[language].zones[zoneIds.indexOf(zone)] || ''
}
export function makeBookingMessage(draft: BookingDraft, language: BookingLanguage = 'ru') {
  const t = dictionary[language] || dictionary.ru
  const lines = [
    t.header,
    '',
    t.audience + ': ' + (draft.audience === 'child' ? t.child : t.adult),
    t.service + ': ' + bookingServiceLabel(draft.service, language),
    t.name + ': ' + clean(draft.name, 80),
  ]
  if (draft.audience === 'child' && clean(draft.ageMonths)) lines.push(t.age + ': ' + clean(draft.ageMonths, 3))
  if (draft.service === 'partial' && draft.bodyZone) lines.push(t.zone + ': ' + bookingZoneLabel(draft.bodyZone, language))
  if (clean(draft.preferredDate)) lines.push(t.date + ': ' + clean(draft.preferredDate, 10))
  if (clean(draft.preferredTime)) lines.push(t.time + ': ' + clean(draft.preferredTime, 5))
  if (clean(draft.note)) lines.push(t.note + ': ' + clean(draft.note))
  if (draft.audience === 'child') lines.push('', t.doctor)
  return lines.join('\n')
}
export function makeWhatsAppLink(draft: BookingDraft, language: BookingLanguage = 'ru') {
  return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(makeBookingMessage(draft, language))
}
