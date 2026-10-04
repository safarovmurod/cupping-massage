// Translates raw Supabase Auth errors into friendly, localized messages
export function translateAuthError(error, t) {
  if (!error) return ''
  const msg = (error.message || String(error)).toLowerCase()
  const code = (error.code || error.error_code || '').toLowerCase()

  if (msg.includes('account_blocked')) {
    return t('auth.error.blocked')
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return t('auth.error.invalidCredentials')
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return t('auth.error.emailNotConfirmed')
  }
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered') || msg.includes('already exists')) {
    return t('auth.error.userExists')
  }
  // Supabase пишет "at least N characters" — N зависит от настройки в кабинете
  if (code === 'weak_password' || /at least \d+ characters/.test(msg) || msg.includes('password should be')) {
    return t('auth.error.weakPassword')
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit')) {
    return t('auth.error.rateLimit')
  }
  if (code === 'email_address_invalid' || (msg.includes('email') && msg.includes('invalid'))) {
    return t('auth.error.invalidEmail')
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return t('auth.error.network')
  }
  if (msg.includes('supabase not configured')) {
    return t('auth.error.notConfigured')
  }
  return t('auth.error.generic')
}

export function translateResetCodeError(code, t) {
  const known = ['invalid_email', 'too_many', 'no_code', 'expired', 'bad_code', 'weak_password']
  return known.includes(code) ? t(`auth.forgot.err.${code}`) : t('auth.error.generic')
}
