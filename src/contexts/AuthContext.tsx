import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.ts'
import { logUserActivity, bumpLoginCounter } from '../lib/userActivity.ts'
import { trackAuthEvent, excludeAdminFromAnalytics } from '../lib/analytics.ts'
import { normalizeEmail } from '../lib/formValidation.ts'
import { readPreference } from '../lib/storage.ts'

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) { setProfile(null); return }
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session?.user.id !== userId) return
      if (data.role === 'admin') await excludeAdminFromAnalytics(userId)
      if (data.is_active === false) {
        setProfile(null)
        await supabase.auth.signOut()
        return
      }
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user || null)
          if (session?.user) {
            await fetchProfile(session.user.id)
          }
        }
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    let profileTimer
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      clearTimeout(profileTimer)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      setUser(session?.user || null)
      if (session?.user) {
        // Supabase calls must run outside the auth callback's lock.
        profileTimer = setTimeout(() => {
          fetchProfile(session.user.id)
          if (event !== 'SIGNED_IN') return
          try {
            const loginKey = session.user.id + ':' + session.user.last_sign_in_at
            if (localStorage.getItem('cookieConsent') === 'accepted' && sessionStorage.getItem('trackedLogin') !== loginKey) {
              sessionStorage.setItem('trackedLogin', loginKey)
              trackAuthEvent('login')
            }
          } catch { /* Tracking is optional when browser storage is blocked. */ }
        }, 0)
      } else {
        setProfile(null)
      }
    })

    return () => { mounted = false; clearTimeout(profileTimer); listener?.subscription?.unsubscribe() }
  }, [fetchProfile])

  // extra — любые дополнительные поля профиля (phone, city, birth_date, ...)
  const signUp = useCallback(async (email, password, fullName, extra = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email), password,
      options: {
        data: {
          full_name: fullName,
          lang: readPreference('lang', 'ru', ['ru', 'tj', 'en']),
          ...extra,
        },
      },
    })
    if (error) throw error
    // Профиль создаётся триггером handle_new_user — ручной insert не нужен.
    return data
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
    if (error) throw error

    // Блокировка аккаунта администратором
    let role = 'user'
    if (data?.user) {
      const { data: prof } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.user.id).single()
      if (prof && prof.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('ACCOUNT_BLOCKED')
      }
      if (prof?.role) role = prof.role
      logUserActivity(data.user.id, 'login', { email })
      bumpLoginCounter(data.user.id)
    }
    // role нужен странице входа, чтобы решить куда вести: клиента на сайт, админа в админку
    return { ...data, role }
  }, [])

  // Вход через Google. Провайдер включается в кабинете Supabase
  // (Authentication → Providers → Google).
  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (user?.id) await logUserActivity(user.id, 'logout')
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [user])

  const updateProfile = useCallback(async (fields) => {
    if (!user?.id) throw new Error('Не авторизован')
    const { error } = await supabase.from('profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) throw error
    await logUserActivity(user.id, 'profile_update', { fields: Object.keys(fields) })
    await fetchProfile(user.id)
  }, [user, fetchProfile])

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setPasswordRecovery(false)
  }, [])

  const value = {
    user, profile, loading, passwordRecovery,
    signUp, signIn, signInWithGoogle, signOut, resetPassword, updatePassword, updateProfile,
    refreshProfile: () => user && fetchProfile(user.id)
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext) as any
