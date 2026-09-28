/**
 * Browser storage can be unavailable (private windows, blocked site data), so every access is guarded.
 * The site works without it; storage only remembers language and an unfinished request.
 */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const storage = {
  get: (key: string) => safe(() => window.localStorage.getItem(key), null),
  set: (key: string, value: string) => safe(() => window.localStorage.setItem(key, value), undefined),
}

export const sessionStore = {
  get: (key: string) => safe(() => window.sessionStorage.getItem(key), null),
  set: (key: string, value: string) => safe(() => window.sessionStorage.setItem(key, value), undefined),
  remove: (key: string) => safe(() => window.sessionStorage.removeItem(key), undefined),
}
