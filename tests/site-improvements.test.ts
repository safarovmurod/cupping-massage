import test from 'node:test'
import assert from 'node:assert/strict'
import { getPageMetadata, renderMetadata, SITE_URL, escapeHtml } from '../src/lib/seo.ts'
import { readPreference, savePreference } from '../src/lib/storage.ts'

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

test('language preference safely falls back with blocked, invalid or unavailable storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Blocked') } })
    assert.equal(readPreference('lang', 'ru', ['ru', 'tj', 'en']), 'ru')
    assert.doesNotThrow(() => savePreference('lang', 'tj'))
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'invalid' } })
    assert.equal(readPreference('lang', 'ru', ['ru', 'tj', 'en']), 'ru')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
