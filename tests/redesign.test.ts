import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BRAND_NAME, INSTAGRAM_DM_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL, brandCopy, getBrandCopy } from '../src/lib/brand.ts'
import { validateLead } from '../src/lib/formValidation.ts'
import { getPageMetadata } from '../src/lib/seo.ts'

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('single verified brand and Instagram booking across all languages', () => {
  assert.equal(BRAND_NAME, 'Мама и малыш')
  assert.equal(INSTAGRAM_HANDLE, '@mama_i_malish_tj')
  assert.equal(INSTAGRAM_URL, 'https://www.instagram.com/mama_i_malish_tj/')
  assert.equal(INSTAGRAM_DM_URL, 'https://ig.me/m/mama_i_malish_tj')
  assert.deepEqual(Object.keys(brandCopy).sort(), ['en', 'ru', 'tj'])
  assert.equal(getBrandCopy('unknown'), brandCopy.ru)
  for (const lang of ['ru', 'tj', 'en'] as const) {
    const copy = getBrandCopy(lang)
    assert.equal(copy.prices.length, 7, lang)
    assert.equal(copy.faqs.length, 5, lang)
    assert.equal(copy.bookingSteps.length, 4, lang)
    assert.match(copy.prices[0].price, /700/)
    assert.match(copy.prices[1].price, /1.?700/)
    assert.match(copy.prices[2].price, /70/)
    assert.match(copy.prices[3].price, /70/)
    assert.match(copy.prices[4].price, /15/)
    assert.match(copy.prices[5].price, /20/)
    assert.match(copy.prices[6].price, /(?:запрос|дархост|ask)/i)
    assert.match(copy.prices[0].duration, /10/)
    assert.match(copy.prices[0].duration, /30/)
    assert.match(copy.prices[1].duration, /10/)
    assert.ok(copy.safetyText.length > 90)
    assert.ok(copy.safetyDisclaimer.length > 40)
    assert.equal(copy.nav.length, 5)
    assert.ok(copy.formButton.length > 4)
    for (const [index, item] of copy.prices.entries()) {
      assert.match(item.icon, /^(child|adult|cupping|partial|electro|light)$/, `${lang} service ${index}`)
      assert.doesNotMatch(item.price, /\b(?:USD|EUR|RUB)\b/)
    }
  }
  assert.match(brandCopy.ru.prices[0].note, /врач/)
  assert.match(brandCopy.tj.prices[0].note, /духтур/)
  assert.match(brandCopy.en.prices[0].note, /doctor/)
})

test('public website imports MUI icons and a single SVG brand mark, not decorative emoji', () => {
  const home = read('src/pages/Home.tsx')
  const header = read('src/components/layout/Header.tsx')
  const footer = read('src/components/layout/Footer.tsx')
  const mark = read('src/components/brand/BrandMark.tsx')
  const favicon = read('public/favicon.svg')
  assert.match(home, /ServiceIcon/)
  assert.match(home, /FavoriteBorderRounded/)
  assert.match(header, /BrandMark/)
  assert.match(footer, /BrandMark/)
  assert.match(mark, /<svg/)
  assert.match(favicon, /<svg/)
  assert.doesNotMatch(home, /[🧸🌷🍃🤍⚡💡]/u)
  assert.doesNotMatch(header, /[🧸🌷🍃🤍⚡💡]/u)
})

test('MUI language Select uses the existing persistence-capable context', () => {
  const source = read('src/components/brand/LanguageSelect.tsx')
  const context = read('src/contexts/LanguageContext.tsx')
  assert.match(source, /@mui\/material\/Select/)
  assert.match(source, /MenuItem/)
  assert.match(source, /value=\{lang\}/)
  assert.match(source, /changeLang\(event\.target\.value\)/)
  assert.match(context, /savePreference\('lang'/)
  assert.match(context, /readPreference\('lang'/)
})

test('real public booking form keeps legacy validation and Supabase leads insert path', () => {
  const source = read('src/pages/Contact.tsx')
  assert.match(source, /validateLead\(form, forWhom\)/)
  assert.match(source, /supabase\.from\('leads'\)\.insert/)
  assert.match(source, /busy\.current/)
  assert.match(source, /if \(error\) throw error/)
  assert.match(source, /role="alert"/)
  assert.match(source, /aria-busy=\{sending\}/)
  assert.deepEqual(validateLead({ name: 'Test User', phone: '+992 900 123 456', time: '', comment: '' }, 'child'), {})
  assert.equal(validateLead({ name: 'X', phone: '123', time: '', comment: '' }, 'child').phone, 'contact.form.err.phone')
})

test('admin role checks remain in place and private SEO is not indexed', () => {
  const app = read('src/App.tsx')
  const auth = read('src/contexts/AuthContext.tsx')
  const content = read('src/pages/admin/Content.tsx')
  assert.match(app, /profile\?\.role !== 'admin'/)
  assert.match(app, /profile\?\.is_active !== true/)
  assert.match(app, /<ProtectedRoute>/)
  assert.match(auth, /supabase\.auth\.getSession/)
  assert.match(auth, /signInWithOAuth/)
  assert.match(content, /supabase\.from\('site_content'\)\.upsert/)
  assert.match(content, /BRAND_SECTIONS/)
  for (const route of ['/login', '/register', '/admin', '/admin/leads']) {
    assert.equal(getPageMetadata(route).robots, 'noindex, nofollow')
  }
})
