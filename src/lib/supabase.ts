import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './supabaseConfig.ts'

// Fail closed in every environment, including Vite's production-mode Preview.
// Never read a baked-in production URL/key as a fallback.
const config = resolveSupabaseConfig({
  stage: import.meta.env.VITE_DEPLOY_STAGE,
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  productionOrigin: import.meta.env.VITE_PRODUCTION_ORIGIN,
  browserOrigin: typeof window === 'undefined' ? undefined : window.location.origin,
})

export const isSupabaseConfigured = () => true
export const supabase = createClient(config.url, config.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
