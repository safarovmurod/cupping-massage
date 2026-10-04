export function normalizeEmail(email: string) {
  return email.trim()
}

export function isValidEmail(email: string) {
  const normalized = normalizeEmail(email)
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function validateLead(form: { name: string; phone: string; time: string; comment: string }, forWhom: string) {
  const errors: Record<string, string> = {}
  const name = form.name.trim()
  const phone = form.phone.trim()
  const digits = phone.replace(/\D/g, '')
  if (name.length < 2 || name.length > 80) errors.name = 'contact.form.err.name'
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 9 || digits.length > 15) errors.phone = 'contact.form.err.phone'
  if (form.time.trim().length > 80) errors.time = 'contact.form.err.length'
  if (form.comment.trim().length > 500) errors.comment = 'contact.form.err.length'
  if (!['woman', 'child'].includes(forWhom)) errors.forWhom = 'contact.form.err.forWhom'
  return errors
}
