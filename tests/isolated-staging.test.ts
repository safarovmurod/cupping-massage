import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const text = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const root = 'testing/isolated/supabase/migrations/'
const files = readdirSync(new URL('../' + root, import.meta.url)).filter(n => n.endsWith('.sql')).sort()
const tables = [
  'admin_activity', 'analytics_events', 'leads', 'password_reset_requests',
  'profiles', 'services', 'site_content', 'site_settings', 'user_activity'
]

test('isolated migration set is separate from production migration directory', () => {
  assert.equal(files.length, 3)
  assert.match(text('testing/isolated/supabase/config.toml'), /project_id\s*=\s*"mama_i_malish_isolated_2026"/)
  assert.match(text('testing/isolated/supabase/config.toml'), /major_version\s*=\s*17/)
  assert.match(text('testing/isolated/supabase/config.toml'), /\[auth.external.google\][\s\S]*?enabled\s*=\s*false/)
  assert.doesNotMatch(text('testing/isolated/supabase/config.toml'), /alafwzjqxwjanoqrirwi|sb_secret_|service_role/)
})

test('reviewed migrations have no direct top-level data inserts or data mutations', () => {
  for (const file of files) {
    const sql = text(root + file)
    let dollarOpen = false
    for (const [index,line] of sql.split('\n').entries()) {
      const before = dollarOpen
      for (const match of line.matchAll(/\$\$|\$function\$/g)) dollarOpen = !dollarOpen
      if (before || line.trimStart().startsWith('--')) continue
      assert.doesNotMatch(line, /^\s*(INSERT INTO|UPDATE |DELETE FROM |TRUNCATE |COPY |CREATE ROLE|ALTER ROLE)\b/i,
        `top-level data mutation in ${file}:${index+1}`)
    }
    assert.equal(dollarOpen, false, `unclosed function delimiter in ${file}`)
    assert.doesNotMatch(sql, /992007336264|safarovvv\.i8|Зарафшон 22\/1/i)
  }
})

test('staging seed contains no real client data and has no test-auth-user inserts', () => {
  const seed = text('testing/isolated/supabase/seed.sql')
  assert.match(seed, /example\.invalid|Synthetic|Тестовое окружение/)
  const executable = seed.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n')
  assert.doesNotMatch(executable, /auth\.users|public\.profiles|992[0-9]{9}|gmail\.com/)
  assert.match(text('testing/isolated/test-auth-crud.mjs'), /54321/)
  assert.match(text('testing/isolated/test-auth-crud.mjs'), /localServiceKey/)
})

test('nine-table rights rehearsal and explicit Docker project checks are isolated', () => {
  const script = text('testing/isolated/run-acl-local.sh')
  const up = text('security/proposals/20261011_truncate_grants_up.sql')
  const after = text('testing/isolated/sql/assert-after.sql')
  const rollback = text('security/proposals/20261011_truncate_grants_rollback.sql')
  assert.match(script, /EXPECTED="supabase_db_mama_i_malish_isolated_2026"/)
  assert.match(script, /docker context show/)
  assert.match(script, /REPO_ROOT="\$\(cd "\$SCRIPT_DIR\/\.\.\/\.\."/)
  assert.match(up, /REVOKE TRUNCATE ON TABLE/)
  assert.match(rollback, /GRANT TRUNCATE ON TABLE/)
  for (const name of tables) {
    for (const file of [up, after, rollback]) assert.ok(file.includes(name), `missing ${name} ACL assertion`)
  }
})
