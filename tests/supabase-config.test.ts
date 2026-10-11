import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveSupabaseConfig } from '../src/lib/supabaseConfig.ts'

const LIVE_URL = 'https://alafwzjqxwjanoqrirwi.supabase.co'
const DEMO_KEY = 'sb_publishable_synthetic_nonsecret_123456789'
const source = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8')
const mock = { stage: 'ci-mock', url: 'https://ci-supabase.invalid', anonKey: DEMO_KEY }

test('configuration fails closed when stage or either env var is missing', () => {
  for (const c of [
    {}, { stage: 'local' }, { stage: 'preview', url: 'https://demo.supabase.co' },
    { stage: 'preview', anonKey: DEMO_KEY },
    { stage: 'unknown', url: mock.url, anonKey: DEMO_KEY },
  ]) {
    assert.throws(() => resolveSupabaseConfig(c), /Supabase configuration:/)
  }
  assert.doesNotMatch(source, /default(?:Url|Key)/)
  assert.doesNotMatch(source, /alafwzjqxwjanoqrirwi/)
})

test('local/test cannot connect to production Supabase even with publishable key', () => {
  for (const stage of ['local', 'test', 'preview', 'staging']) {
    assert.throws(() => resolveSupabaseConfig({ stage, url: LIVE_URL, anonKey: DEMO_KEY }), /Supabase configuration:/)
  }
  assert.deepEqual(resolveSupabaseConfig({
    stage: 'local', url: 'http://127.0.0.1:54321', anonKey: DEMO_KEY,
  }), { stage: 'local', url: 'http://127.0.0.1:54321', anonKey: DEMO_KEY })
  assert.throws(() => resolveSupabaseConfig({ stage: 'local', url: 'http://evil.example:54321', anonKey: DEMO_KEY }))
})

test('preview permits only isolated https project; ci-mock permits only reserved fixture', () => {
  assert.equal(resolveSupabaseConfig({
    stage: 'preview', url: 'https://staging-ref.supabase.co', anonKey: DEMO_KEY,
  }).url, 'https://staging-ref.supabase.co')
  assert.deepEqual(resolveSupabaseConfig(mock), mock)
  for (const url of ['https://somewhere.invalid', 'http://staging-ref.supabase.co', 'http://localhost:54321']) {
    assert.throws(() => resolveSupabaseConfig({ stage: 'preview', url, anonKey: DEMO_KEY }))
  }
  assert.throws(() => resolveSupabaseConfig({ stage: 'ci-mock', url: LIVE_URL, anonKey: DEMO_KEY }))
})

test('production configuration requires explicit backend and expected deployed origin', () => {
  const cfg = { stage: 'production', url: LIVE_URL, anonKey: DEMO_KEY,
    productionOrigin: 'https://approved-production.example', browserOrigin: 'https://approved-production.example' }
  assert.equal(resolveSupabaseConfig(cfg).stage, 'production')
  assert.throws(() => resolveSupabaseConfig({ ...cfg, productionOrigin: '' }))
  assert.throws(() => resolveSupabaseConfig({ ...cfg, browserOrigin: 'https://preview.example' }))
  assert.throws(() => resolveSupabaseConfig({ ...cfg, url: 'https://staging-ref.supabase.co' }))
})

test('secret/service_role and malformed values rejected without embedding keys in errors', () => {
  for (const key of [
    'sb_secret_example_123456789', 'service_role',
    'not-a-publishable-key', '', 'eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.x',
  ]) {
    assert.throws(() => resolveSupabaseConfig({ ...mock, anonKey: key }), /Supabase configuration:/)
  }
  for (const url of [
    'https://person:password@ci-supabase.invalid', 'https://ci-supabase.invalid/path',
    'https://ci-supabase.invalid/?token=secret', 'javascript:alert(1)',
  ]) {
    assert.throws(() => resolveSupabaseConfig({ ...mock, url }), /Supabase configuration:/)
  }
})
