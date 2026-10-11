import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { redactCliLog } from '../testing/isolated/ci-local.ts'

test('CLI evidence removes keys, JWTs, DB passwords and credential lines', () => {
  const raw = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature\n' +
    'sb_secret_synthetic123\nsb_publishable_synthetic123\n' +
    'postgresql://postgres:synthetic-password@127.0.0.1:54322/postgres\n' +
    'JWT_SECRET="synthetic-jwt-secret"\nS3_ACCESS_KEY="synthetic-access"\nPASS local migrations'
  const result = redactCliLog(raw)
  for (const secret of ['eyJhbG', 'synthetic123', 'synthetic-password', 'synthetic-jwt-secret', 'synthetic-access']) {
    assert.ok(!result.includes(secret), `credential leaked: ${secret}`)
  }
  assert.ok(result.includes('PASS local migrations'))
})

test('integration workflow is pinned, least privilege and exclusively local', () => {
  const source = readFileSync(new URL('../.github/workflows/supabase-integration.yml', import.meta.url), 'utf8')
  assert.match(source, /runs-on: ubuntu-latest/)
  assert.match(source, /supabase\/setup-cli@45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/)
  assert.match(source, /version: '2\.120\.0'/)
  assert.match(source, /permissions:\s*contents: read/)
  assert.match(source, /persist-credentials: false/)
  assert.match(source, /supabase db reset --local --yes/)
  assert.match(source, /working-directory: testing\/isolated/)
  assert.doesNotMatch(source, /secrets\.|pull_request_target|supabase (?:link|db push|db pull)|--linked|--db-url|--ignore-health-check/)
  for (const action of source.matchAll(/uses:\s*\S+@(\S+)/g)) assert.match(action[1], /^[a-f0-9]{40}$/)
})
