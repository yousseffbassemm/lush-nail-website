import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type User } from '../lib/api'

type Status = 'loading' | 'ready' | 'offline'

interface AuthValue {
  /** 'offline' means the Lush API can't be reached; the site falls back to message/call requests. */
  status: Status
  user: User | null
  signUp: (input: { firstName: string; phone: string; email: string; password: string; lang: 'en' | 'ar' }) => Promise<User>
  logIn: (input: { phone: string; password: string }) => Promise<User>
  resetPassword: (input: { phone: string; code: string; password: string }) => Promise<User>
  logOut: () => Promise<void>
  setUser: (user: User | null) => void
  /** Call when the API says the session ended. */
  sessionEnded: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let cancelled = false
    api<{ user: User | null }>('/auth/me')
      .then(({ user: me }) => {
        if (cancelled) return
        setUser(me)
        setStatus('ready')
      })
      .catch(() => {
        // Without the API (e.g. a static preview) the site still works: requests go by message or phone.
        if (!cancelled) setStatus('offline')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signUp = useCallback<AuthValue['signUp']>(async (input) => {
    const { user: created } = await api<{ user: User }>('/auth/signup', { method: 'POST', body: input })
    setUser(created)
    setStatus('ready')
    return created
  }, [])

  const logIn = useCallback<AuthValue['logIn']>(async (input) => {
    const { user: me } = await api<{ user: User }>('/auth/login', { method: 'POST', body: input })
    setUser(me)
    setStatus('ready')
    return me
  }, [])

  const resetPassword = useCallback<AuthValue['resetPassword']>(async (input) => {
    const { user: me } = await api<{ user: User }>('/auth/reset', { method: 'POST', body: input })
    setUser(me)
    return me
  }, [])

  const logOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }, [])

  const sessionEnded = useCallback(() => setUser(null), [])

  const value = useMemo(
    () => ({ status, user, signUp, logIn, resetPassword, logOut, setUser, sessionEnded }),
    [status, user, signUp, logIn, resetPassword, logOut, sessionEnded],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
