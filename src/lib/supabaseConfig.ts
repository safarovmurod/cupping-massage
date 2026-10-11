// No production defaults. This module is also exercised directly by Node tests.
// Supabase publishable keys are public, but never log credential values in errors.
export type DeployStage = 'local' | 'test' | 'staging' | 'preview' | 'production' | 'ci-mock'

export interface SupabasePublicConfigInput {
  url?: string
  anonKey?: string
  stage?: string
  productionOrigin?: string
  browserOrigin?: string
}

export interface SupabasePublicConfig {
  url: string
  anonKey: string
  stage: DeployStage
}

const LIVE_HOST = 'alafwzjqxwjanoqrirwi.supabase.co'
const MOCK_HOST = 'ci-supabase.invalid'
const STAGES = new Set<DeployStage>(['local', 'test', 'staging', 'preview', 'production', 'ci-mock'])

function parseStrictUrl(text: string, originOnly = false): URL | null {
  try {
    const url = new URL(text)
    if (url.username || url.password || url.search || url.hash) return null
    if (url.pathname !== '/') return null
    if (originOnly && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

function isPublishableKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(value)) return true
  // Legacy Supabase anon JWTs are also public. Do not trust arbitrary JWT roles.
  const parts = value.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'anon'
  } catch {
    return false
  }
}

export function resolveSupabaseConfig(input: SupabasePublicConfigInput): SupabasePublicConfig {
  const stage = input.stage?.trim()
  if (!stage || !STAGES.has(stage as DeployStage)) {
    throw new Error('Supabase configuration: set VITE_DEPLOY_STAGE to local, test, staging, preview, production or ci-mock.')
  }
  const urlValue = input.url?.trim()
  const keyValue = input.anonKey?.trim()
  if (!urlValue || !keyValue) {
    throw new Error('Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are both required; no production fallback is allowed.')
  }
  const url = parseStrictUrl(urlValue)
  if (!url || !isPublishableKey(keyValue)) {
    throw new Error('Supabase configuration: expected a root API URL and a publishable/anon key (never a secret/service_role key).')
  }
  const localHost = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  const isRealHosted = /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
  if (stage === 'local' || stage === 'test') {
    if (!localHost || url.protocol !== 'http:' || url.port !== '54321') {
      throw new Error('Supabase configuration: local/test must use the isolated local API at http://127.0.0.1:54321.')
    }
  } else if (stage === 'ci-mock') {
    if (url.protocol !== 'https:' || url.hostname !== MOCK_HOST) {
      throw new Error('Supabase configuration: ci-mock requires the non-routable CI fixture endpoint.')
    }
  } else if (stage === 'preview' || stage === 'staging') {
    if (url.protocol !== 'https:' || !isRealHosted || url.hostname === LIVE_HOST) {
      throw new Error('Supabase configuration: preview/staging require a DIFFERENT hosted Supabase project, never the live database.')
    }
  } else {
    // Future approved production releases must set both the exact backend and
    // the production origin explicitly. Preview builds may not inherit these.
    if (url.protocol !== 'https:' || url.hostname !== LIVE_HOST) {
      throw new Error('Supabase configuration: production must explicitly select the approved live Supabase endpoint.')
    }
    const expectedOrigin = parseStrictUrl(input.productionOrigin?.trim() ?? '', true)
    if (!expectedOrigin) {
      throw new Error('Supabase configuration: VITE_PRODUCTION_ORIGIN is required for a future production release.')
    }
    if (input.browserOrigin && input.browserOrigin !== expectedOrigin.origin) {
      throw new Error('Supabase configuration: application origin does not match the explicitly approved production origin.')
    }
  }
  return { url: url.origin, anonKey: keyValue, stage: stage as DeployStage }
}
