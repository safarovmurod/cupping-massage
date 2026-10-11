// REAL integration exercises ONLY the Supabase CLI instance on loopback:54321.
// No mocked PostgREST responses and no production connection or data imports.
// Run ONLY from the repo after starting testing/isolated Supabase CLI + Docker.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const workdir = dirname(fileURLToPath(import.meta.url))
const expectedConfig = resolve(workdir, 'supabase', 'config.toml')
const fs = await import('node:fs')
assert.match(fs.readFileSync(expectedConfig, 'utf8'), /project_id\s*=\s*"mama_i_malish_isolated_2026"/)
let status
try {
  status = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: workdir, encoding: 'utf8', timeout: 15000,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch {
  console.error('BLOCKED: isolated local Supabase CLI/Docker is not running. No remote fallback.')
  process.exit(2)
}
const entries = Object.fromEntries(status.split(/\r?\n/).map(s => {
  const [k, ...rest] = s.split('=')
  const v = rest.join('=').replace(/^["']|["']$/g, '')
  return [k?.trim(), v.trim()]
}).filter(([k,v]) => k && v))
const url = entries.API_URL || entries.SUPABASE_URL
const anonKey = entries.ANON_KEY || entries.PUBLISHABLE_KEY
const localServiceKey = entries.SERVICE_ROLE_KEY || entries.SECRET_KEY
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url || '')
    || !anonKey || !localServiceKey) {
  console.error('BLOCKED: Supabase CLI status is not the isolated loopback stack or keys are unavailable.')
  process.exit(2)
}
function client(key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
const service = client(localServiceKey)
const anonymous = client(anonKey)
const ordinary = client(anonKey)
const administrator = client(anonKey)
const uid = randomUUID().slice(0, 12)
const email = `sandbox-user-${uid}@example.invalid`
const adminEmail = `sandbox-admin-${uid}@example.invalid`
const originalPassword = 'Aa1!' + randomBytes(21).toString('base64url')
const newPassword = 'Bb2!' + randomBytes(21).toString('base64url')
const adminPassword = 'Cc3!' + randomBytes(21).toString('base64url')
const samplePhone = '992900' + Array.from({length:6},()=>Math.floor(Math.random()*10)).join('')
let userId, adminId, leadId
let checks = 0
function ok(result, description) {
  if (result.error) throw new Error(`${description}: ${result.error.code || 'API error'}`)
  checks++
  console.log('PASS', description)
  return result.data
}
function noRows(value) { return Array.isArray(value) && value.length === 0 }
async function forbiddenRpc(name, args) {
  const { data, error } = await ordinary.rpc(name, args)
  assert.ok(error || (data && data.ok !== true && (data.error || data.ok === false)),
    `ordinary user bypass of ${name}`)
  checks++
  console.log('PASS non-admin denied by', name)
}
try {
  // Registration via real GoTrue, login/logout via real Auth endpoints.
  const signUp = ok(await ordinary.auth.signUp({ email, password: originalPassword }),
    'real synthetic user registration')
  userId = signUp.user?.id
  assert.ok(userId)
  ok(await ordinary.auth.signInWithPassword({ email, password: originalPassword }), 'real user sign-in')
  ok(await ordinary.auth.signOut(), 'real user sign-out')
  ok(await ordinary.auth.signInWithPassword({ email, password: originalPassword }), 'real user re-login')

  // Elevated test account creation is performed ONLY with the LOCAL service key.
  const created = ok(await service.auth.admin.createUser({
    email: adminEmail, password: adminPassword, email_confirm: true,
  }), 'create local synthetic admin identity')
  adminId = created.user?.id
  assert.ok(adminId)
  ok(await service.from('profiles').update({ role:'admin', is_active:true }).eq('id',adminId),
    'assign staging-only admin role')
  ok(await administrator.auth.signInWithPassword({ email:adminEmail, password:adminPassword }),
    'real test admin sign-in')

  assert.equal(ok(await ordinary.rpc('is_admin'), 'ordinary is_admin RPC'), false)
  assert.equal(ok(await administrator.rpc('is_admin'), 'admin is_admin RPC'), true)
  assert.equal(ok(await anonymous.rpc('is_admin'), 'anonymous is_admin RPC'), false)
  const self=ok(await ordinary.from('profiles').select('id,role,is_active').eq('id',userId),
    'RLS user own profile')
  assert.equal(self.length,1)
  assert.equal(self[0].role,'user')
  assert.ok(noRows(ok(await ordinary.from('profiles').select('id').eq('id',adminId),
    'RLS denies other user profile')))

  // Trigger must silently override privileged update even when the SQL UPDATE succeeds.
  await ordinary.from('profiles').update({ role:'admin', is_active:false }).eq('id',userId)
  const stillRegular=ok(await service.from('profiles').select('role,is_active').eq('id',userId).single(),
    'profile escalation check from staging service client')
  assert.equal(stillRegular.role,'user')
  assert.equal(stillRegular.is_active,true)

  const adminRpc=[
    ['admin_create_reset_code_for_email',{p_email:adminEmail}],
    ['admin_delete_test_users',{}],
    ['admin_delete_user',{target_user_id:adminId}],
    ['admin_get_user_details',{target_user_id:adminId}],
    ['admin_issue_reset_code',{p_request_id:randomUUID()}],
    ['admin_set_user_password',{target_user_id:adminId,new_password:'Aa1!SyntheticOnly123456'}],
  ]
  for (const [name,args] of adminRpc) await forbiddenRpc(name,args)
  assert.ok(noRows(ok(await ordinary.from('leads').select('id'),
    'RLS denies ordinary lead listing')))
  assert.ok(noRows(ok(await anonymous.from('leads').select('id'),
    'RLS denies anonymous lead listing')))

  // Form creates a synthetic lead. Public insert cannot return a row without SELECT.
  ok(await anonymous.from('leads').insert({
    name:'Synthetic Guest', phone:samplePhone,
    message:'Fixture only - never an actual client', preferred_time:'Tomorrow',
    for_whom:'woman',
  }), 'real anon lead form INSERT (local DB only)')
  const rows=ok(await administrator.from('leads').select('id,status').eq('phone',samplePhone),
    'real admin lead SELECT (local DB only)')
  assert.equal(rows.length,1)
  leadId=rows[0].id
  assert.equal(rows[0].status,'new')
  await ordinary.from('leads').update({status:'completed'}).eq('id',leadId)
  assert.equal((ok(await administrator.from('leads').select('status').eq('id',leadId).single(),
    'no ordinary lead UPDATE')).status,'new')
  ok(await administrator.from('leads').update({status:'in_progress'}).eq('id',leadId),
    'admin UPDATE synthetic lead')
  assert.equal((ok(await administrator.from('leads').select('status').eq('id',leadId).single(),
    'verify admin lead UPDATE')).status,'in_progress')
  await ordinary.from('leads').delete().eq('id',leadId)
  assert.equal((ok(await administrator.from('leads').select('id').eq('id',leadId),
    'no ordinary lead DELETE')).length,1)
  ok(await administrator.from('leads').delete().eq('id',leadId),
    'admin DELETE synthetic lead')
  assert.ok(noRows(ok(await administrator.from('leads').select('id').eq('id',leadId),
    'verify synthetic lead deleted')))
  leadId=undefined

  for (const table of ['site_content','site_settings']) {
    const key=`sandbox.integration.${uid}.${table}`
    ok(await administrator.from(table).insert({key,value:'synthetic-v1'}),
      `admin ${table} INSERT`)
    assert.equal((ok(await anonymous.from(table).select('value').eq('key',key).single(),
      `public ${table} SELECT`)).value,'synthetic-v1')
    await ordinary.from(table).update({value:'escalated'}).eq('key',key)
    assert.equal((ok(await administrator.from(table).select('value').eq('key',key).single(),
      `RLS denies ordinary ${table} UPDATE`)).value,'synthetic-v1')
    ok(await administrator.from(table).update({value:'synthetic-v2'}).eq('key',key),
      `admin ${table} UPDATE`)
    ok(await administrator.from(table).delete().eq('key',key),
      `admin ${table} DELETE`)
    assert.ok(noRows(ok(await anonymous.from(table).select('key').eq('key',key),
      `verify ${table} removed`)))
  }

  // Services public SELECT policy calls is_admin() even for anon: don't revoke
  // EXECUTE from is_admin() without rewriting this policy in a separate review.
  assert.ok(Array.isArray(ok(await anonymous.from('services').select('id').limit(1),
    'anonymous services SELECT / is_admin policy')))

  // Password reset through actual SECURITY DEFINER public and admin RPCs.
  assert.equal((ok(await anonymous.rpc('request_password_reset',{p_email:email,p_lang:'ru'}),
    'real anonymous password reset request')).ok,true)
  const issued=ok(await administrator.rpc('admin_create_reset_code_for_email',{p_email:email}),
    'real admin-issued synthetic reset code')
  assert.equal(issued.ok,true)
  assert.match(issued.code,/^[0-9]{6}$/)
  const denied=ok(await anonymous.rpc('reset_password_with_code',{
    p_email:email,p_code:'bad',p_new_password:newPassword,
  }),'invalid reset code rejected')
  assert.equal(denied.ok,false)
  const changed=ok(await anonymous.rpc('reset_password_with_code',{
    p_email:email,p_code:issued.code,p_new_password:newPassword,
  }),'real local reset code password flow')
  assert.equal(changed.ok,true)
  assert.ok((await client(anonKey).auth.signInWithPassword({
    email,password:originalPassword,
  })).error,'old password should not authenticate after reset')
  ok(await client(anonKey).auth.signInWithPassword({email,password:newPassword}),
    'new password authenticates')

  console.log(`REAL ISOLATED SUPABASE PASS: ${checks} checks, with synthetic data only.`)
} finally {
  // Only identities created in this local test run are eligible for cleanup.
  if (userId) await service.auth.admin.deleteUser(userId)
  if (adminId) await service.auth.admin.deleteUser(adminId)
}
