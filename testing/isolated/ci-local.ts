// CI safety checks and credential-free CLI logs. Never reads a remote database.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workdir = dirname(fileURLToPath(import.meta.url))
const project = 'mama_i_malish_isolated_2026'

export function redactCliLog(value: string): string {
  return value
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED JWT]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, '[REDACTED LOCAL KEY]')
    .replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, '$1[REDACTED]@')
    .replace(/^.*(?:JWT_SECRET|SERVICE_ROLE_KEY|ANON_KEY|SECRET_KEY|PUBLISHABLE_KEY|S3_ACCESS_KEY|S3_SECRET_KEY|JWT secret|Access Key|Secret Key)\s*[:=│].*$/gim, '[REDACTED CREDENTIAL LINE]')
}

function preflight() {
  const config = readFileSync(resolve(workdir, 'supabase/config.toml'), 'utf8')
  assert.match(config, new RegExp(`project_id\\s*=\\s*"${project}"`))
  assert.match(config, /major_version\s*=\s*17\b/)
  assert.match(config, /\[auth.external.google\][\s\S]*?enabled\s*=\s*false/)
  assert.equal(existsSync(resolve(workdir, 'supabase/.temp/project-ref')), false, 'sandbox must not be linked')
  for (const name of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'DOCKER_HOST', 'DOCKER_CONTEXT']) {
    assert.ok(!process.env[name], `BLOCKED: unexpected external configuration ${name}`)
  }
  const context = execFileSync('docker', ['context', 'show'], { encoding: 'utf8' }).trim()
  assert.equal(context, 'default', 'CI must use the runner default Docker daemon')
  const endpoint = execFileSync('docker', ['context', 'inspect', context, '--format', '{{.Endpoints.docker.Host}}'],
    { encoding: 'utf8' }).trim()
  assert.equal(endpoint, 'unix:///var/run/docker.sock', 'CI Docker must use the local socket')
  console.log('PASS isolation preflight: dedicated project, PostgreSQL 17, unlinked workdir, local Docker, no external credentials')
}

function status() {
  const container = `supabase_db_${project}`
  assert.equal(execFileSync('docker', ['ps', '--filter', `name=^/${container}$`, '--format', '{{.Names}}'],
    { encoding: 'utf8' }).trim(), container)
  const output = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: workdir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000,
  })
  const values = Object.fromEntries(output.split(/\r?\n/).map(line => {
    const [name, ...rest] = line.split('=')
    return [name.trim(), rest.join('=').replace(/^["']|["']$/g, '').trim()]
  }))
  assert.match(values.API_URL || values.SUPABASE_URL || '', /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/)
  assert.ok(values.ANON_KEY || values.PUBLISHABLE_KEY)
  assert.ok(values.SERVICE_ROLE_KEY || values.SECRET_KEY)
  const version = execFileSync('docker', ['exec', container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres',
    '-Atc', 'SHOW server_version_num'], { encoding: 'utf8' }).trim()
  assert.ok(Number(version) >= 170000 && Number(version) < 180000, 'actual database must be PostgreSQL 17')
  console.log(`PASS real local stack: API loopback:54321; PostgreSQL server_version_num=${version}; local credentials available (values withheld)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2]
  if (mode === 'redact') process.stdout.write(redactCliLog(readFileSync(0, 'utf8')))
  else if (mode === 'preflight') preflight()
  else if (mode === 'status') status()
  else throw new Error('Expected preflight, status or redact')
}
