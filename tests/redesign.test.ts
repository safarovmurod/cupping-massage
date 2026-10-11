import test from 'node:test'
import assert from 'node:assert/strict'
import { brandCopy } from '../src/lib/brand.ts'
import { LATITUDE, LONGITUDE, YANDEX_MAP_URL, YANDEX_ROUTE_URL, YANDEX_WIDGET_URL } from '../src/lib/location.ts'

test('all languages keep the verified six services and combined electrophoresis prices', () => {
  for (const copy of Object.values(brandCopy)) {
    assert.equal(copy.prices.length, 6)
    assert.deepEqual(copy.prices.map(item => item.id), ['child', 'adult', 'cupping', 'partial', 'electro', 'light'])
    const electro = copy.prices.find(item => item.id === 'electro')!
    assert.match(electro.price, /15 \/ 20/)
    assert.match(copy.prices[0].price, /700/)
    assert.match(copy.prices[1].price.replace(',', ' '), /1\s*700/)
    assert.ok(copy.prices.every(item => item.title && item.price && item.duration && item.note))
  }
})

test('Yandex targets use the exact owner coordinates in each URL format', () => {
  assert.equal(LATITUDE, 38.585812)
  assert.equal(LONGITUDE, 68.716695)
  for (const value of [YANDEX_MAP_URL, YANDEX_WIDGET_URL]) {
    const url = new URL(value)
    assert.equal(url.protocol, 'https:')
    assert.equal(url.hostname, 'yandex.ru')
    assert.equal(url.searchParams.get('ll'), '68.716695,38.585812')
    assert.equal(url.searchParams.get('pt'), '68.716695,38.585812,pm2rdm')
  }
  const route = new URL(YANDEX_ROUTE_URL)
  assert.equal(route.searchParams.get('rtext'), '~38.585812,68.716695')
  assert.equal(route.searchParams.get('rtt'), 'auto')
})
