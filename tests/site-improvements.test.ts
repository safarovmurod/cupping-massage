import test from 'node:test'
import assert from 'node:assert/strict'
import { getPageMetadata, getStructuredData, renderMetadata, SITE_URL, escapeHtml } from '../src/lib/seo.ts'
import { getMassageCatalogue } from '../src/lib/massage.ts'
import { validateBooking, buildBookingMessage, type BookingValues } from '../src/lib/booking.ts'

test('home and old contact alias canonicalize to the public site; removed paths have noindex', () => {
  assert.equal(SITE_URL, 'https://mama-i-malish-tj.pages.dev')
  for (const route of ['/', '/contact/']) assert.equal(getPageMetadata(route).canonical, SITE_URL + '/')
  for (const route of ['/login', '/register', '/admin', '/admin/users', '/missing', '/reset-password']) {
    assert.equal(getPageMetadata(route).robots, 'noindex, nofollow')
    assert.equal(getPageMetadata(route).canonical, null)
  }
  assert.equal(getPageMetadata('/', 'tj').locale, 'tg_TJ')
  assert.match(getPageMetadata('/').description, /WhatsApp/)
  assert.equal(getPageMetadata('/').image, SITE_URL + '/images/baby-care.webp')
  assert.match(renderMetadata('/missing'), /noindex, nofollow/)
  assert.doesNotMatch(renderMetadata('/missing'), /rel="canonical"/)
  assert.match(renderMetadata('/', 'https://example.test'), /https:\/\/example.test\/images\/baby-care.webp/)
  assert.equal(escapeHtml('<"&\'>'), '&lt;&quot;&amp;&#39;&gt;')
})

test('all massage variants carry their exact localized title and enforce the recipient in bookings', () => {
  for (const language of ['ru', 'tj', 'en'] as const) {
    const catalogue = getMassageCatalogue(language)
    const services = catalogue.groups.flatMap(group => group.services)
    assert.equal(services.length, 14)
    assert.equal(new Set(services.map(service => service.id)).size, 14)
    for (const service of services) {
      const values: BookingValues = { name: 'Synthetic guest', phone: '+992 000 000 000', service: service.id, forWhom: service.audience, childAge: service.audience === 'child' ? '6 months' : '', preferredDay: '2026-11-02', time: '', note: '', channel: 'whatsapp' }
      assert.deepEqual(validateBooking(values, services, language), {})
      assert.ok(buildBookingMessage(values, services, language).includes(service.title))
      assert.ok(validateBooking({ ...values, forWhom: service.audience === 'child' ? 'woman' : 'child', childAge: '6 months' }, services, language).forWhom)
    }
  }
})

test('business schema matches the real address, contact, catalogue and verified course prices', () => {
  const schema = getStructuredData()
  assert.equal(schema['@type'], 'HealthAndBeautyBusiness')
  assert.equal(schema.url, SITE_URL + '/')
  assert.equal(schema.telephone, '+992007336264')
  assert.equal(schema.address.streetAddress, 'Зарафшон 22/1')
  assert.equal(schema.geo.latitude, 38.585812)
  assert.equal(schema.geo.longitude, 68.716695)
  assert.deepEqual(schema.makesOffer.map(offer => offer.price), [700, 1700, 70, 70])
  assert.ok(schema.makesOffer.every(offer => offer.priceCurrency === 'TJS'))
  assert.equal(schema.hasOfferCatalog.itemListElement.flatMap(group => group.itemListElement).length, 14)
  assert.doesNotMatch(JSON.stringify(schema), /aggregateRating|openingHours|MedicalClinic/)
  assert.match(renderMetadata('/'), /application\/ld\+json/)
  assert.doesNotMatch(renderMetadata('/missing'), /application\/ld\+json/)
})
