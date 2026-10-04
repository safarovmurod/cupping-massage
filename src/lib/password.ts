// Правила пароля должны совпадать с настройками Supabase
// (Authentication → Providers → Email):
// минимум 8 символов, строчная и заглавная латинская буква и цифра.
export function isStrongPassword(password) {
  if (!password || password.length < 8) return false
  if (new TextEncoder().encode(password).length > 72) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

export function passwordError(password: string) {
  if (new TextEncoder().encode(password).length > 72) return 'auth.password.tooLong'
  return isStrongPassword(password) ? '' : 'auth.password.min'
}

export function generateSecurePassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789']
  const alphabet = groups.join('') + '!@#$%*'
  function randomIndex(length: number) {
    const limit = Math.floor(0x100000000 / length) * length
    const buffer = new Uint32Array(1)
    do { crypto.getRandomValues(buffer) } while (buffer[0] >= limit)
    return buffer[0] % length
  }
  const characters = groups.map(group => group[randomIndex(group.length)])
  while (characters.length < 20) characters.push(alphabet[randomIndex(alphabet.length)])
  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[characters[i], characters[j]] = [characters[j], characters[i]]
  }
  return characters.join('')
}
