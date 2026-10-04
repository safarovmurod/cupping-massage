// Preferences are optional: private browsing and blocked storage must not break rendering.
export function readPreference(name: string, fallback: string, allowed: string[]) {
  try {
    const value = localStorage.getItem(name)
    return allowed.includes(value) ? value : fallback
  } catch { return fallback }
}

export function savePreference(name: string, value: string) {
  try { localStorage.setItem(name, value) } catch { /* Keep the preference for this session. */ }
}
