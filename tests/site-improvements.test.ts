import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLead, isValidEmail, normalizeEmail } from '../src/lib/formValidation.ts'
import { generateSecurePassword, isStrongPassword, passwordError } from '../src/lib/password.ts'
import { getPageMetadata, renderMetadata, SITE_URL, escapeHtml } from '../src/lib/seo.ts'
import { readPreference, savePreference } from '../src/lib/storage.ts'
import { translateResetCodeError } from '../src/lib/authErrors.ts'

test('contact validation accepts international formatted numbers and rejects malformed or oversized input', () => {
  const valid = { name: 'Мурод', phone: '+992 (007) 336-264', time: '', comment: '' }
  assert.deepEqual(validateLead(valid, 'woman'), {})
  for (const phone of ['call 992007336264', '++992007336264', '123', '1234567890123456']) {
    assert.equal(validateLead({ ...valid, phone }, 'child').phone, 'contact.form.err.phone')
  }
  assert.ok(validateLead({ ...valid, name: '  ' }, 'woman').name)
  assert.ok(validateLead({ ...valid, comment: 'a'.repeat(501) }, 'child').comment)
  assert.ok(validateLead({ ...valid, time: 'a'.repeat(81) }, 'child').time)
  assert.ok(validateLead(valid, 'admin').forWhom)
})

test('email normalization preserves the local part and validation rejects whitespace and overlong values', () => {
  assert.equal(normalizeEmail('  Name+tag@example.com  '), 'Name+tag@example.com')
  assert.equal(isValidEmail(' Name+tag@example.com '), true)
  for (const email of ['abc', 'a b@example.com', '@example.com', 'a'.repeat(255) + '@example.com']) assert.equal(isValidEmail(email), false)
})

test('generated administrator passwords use Web Crypto and meet password requirements', () => {
  const generated = Array.from({ length: 30 }, () => generateSecurePassword())
  assert.equal(new Set(generated).size, generated.length)
  for (const password of generated) {
    assert.equal(password.length, 20)
    assert.equal(isStrongPassword(password), true)
  }
  assert.equal(passwordError('Aa1' + 'я'.repeat(35)), 'auth.password.tooLong')
  assert.equal(passwordError('password'), 'auth.password.min')
  assert.equal(passwordError('Password1'), '')
})

test('SEO gives public pages unique canonical metadata and excludes account, administrator and unknown routes', () => {
  assert.equal(getPageMetadata('/contact/').canonical, SITE_URL + '/contact')
  assert.notEqual(getPageMetadata('/').title, getPageMetadata('/contact').title)
  for (const path of ['/login', '/register', '/forgot-password', '/reset-password', '/admin', '/admin/users', '/missing', '/administrator']) {
    assert.equal(getPageMetadata(path).robots, 'noindex, nofollow')
    assert.equal(getPageMetadata(path).canonical, null)
  }
  assert.equal(getPageMetadata('/', 'tj').locale, 'tg_TJ')
  assert.match(renderMetadata('/contact'), /rel="canonical"/)
  assert.match(renderMetadata('/login'), /noindex, nofollow/)
  assert.doesNotMatch(renderMetadata('/login'), /rel="canonical"/)
  assert.equal(escapeHtml('<"&\'>'), '&lt;&quot;&amp;&#39;&gt;')
})

test('invalid preferences and unavailable browser storage safely fall back', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked') } })
    assert.equal(readPreference('lang', 'ru', ['ru', 'tj', 'en']), 'ru')
    assert.doesNotThrow(() => savePreference('theme', 'light'))
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'invalid' } })
    assert.equal(readPreference('theme', 'dark', ['dark', 'light']), 'dark')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})

test('unexpected password-reset responses show the friendly fallback instead of raw error keys', () => {
  const translate = (key: string) => key
  assert.equal(translateResetCodeError('bad_code', translate), 'auth.forgot.err.bad_code')
  assert.equal(translateResetCodeError('unexpected_internal_error', translate), 'auth.error.generic')
  assert.equal(translateResetCodeError(undefined, translate), 'auth.error.generic')
})
