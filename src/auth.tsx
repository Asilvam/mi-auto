import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type User = { id: string; email: string; name: string; pictureUrl: string }
type AuthContextValue = {
  user: User | null
  loading: boolean
  signInWithGoogle: (credential: string) => Promise<void>
  signOut: () => Promise<void>
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>
}

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
const REQUEST_TIMEOUT_MS = 12_000
const apiRequest = (url: string, init: RequestInit = {}) => fetch(url, {
  ...init,
  signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
})
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const accessToken = useRef<string | null>(null)
  const renewal = useRef<Promise<string> | null>(null)
  const csrfToken = useRef<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getCsrf = useCallback(async () => {
    const response = await apiRequest(`${API}/api/auth/csrf`, { credentials: 'include' })
    if (!response.ok) throw new Error('No se pudo preparar la sesión segura.')
    const data = await response.json() as { csrfToken: string }
    csrfToken.current = data.csrfToken
    return data.csrfToken
  }, [])

  const renew = useCallback(() => {
    if (renewal.current) return renewal.current
    const work = (async () => {
      const csrf = csrfToken.current ?? await getCsrf()
      const response = await apiRequest(`${API}/api/auth/refresh`, {
        method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrf },
      })
      if (!response.ok) throw new Error('Sesión vencida.')
      const data = await response.json() as { accessToken: string; user: User }
      accessToken.current = data.accessToken
      setUser(data.user)
      return data.accessToken
    })()
    renewal.current = work
    void work.finally(() => { if (renewal.current === work) renewal.current = null }).catch(() => undefined)
    return work
  }, [getCsrf])

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) {
        accessToken.current = null
        setUser(null)
        setLoading(false)
      }
    }, REQUEST_TIMEOUT_MS)
    void renew().catch(() => { if (active) { accessToken.current = null; setUser(null) } }).finally(() => {
      window.clearTimeout(timeout)
      if (active) setLoading(false)
    })
    return () => { active = false; window.clearTimeout(timeout) }
  }, [renew])

  const signInWithGoogle = useCallback(async (credential: string) => {
    const response = await apiRequest(`${API}/api/auth/google`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string }
      throw new Error(body.message ?? 'No se pudo iniciar sesión con Google.')
    }
    const data = await response.json() as { accessToken: string; user: User }
    accessToken.current = data.accessToken
    setUser(data.user)
    const csrfResponse = await apiRequest(`${API}/api/auth/csrf`, { credentials: 'include' })
    if (csrfResponse.ok) csrfToken.current = (await csrfResponse.json() as { csrfToken: string }).csrfToken
  }, [])

  const signOut = useCallback(async () => {
    try {
      const csrf = csrfToken.current ?? await getCsrf()
      await apiRequest(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrf } })
    } finally {
      accessToken.current = null
      setUser(null)
    }
  }, [getCsrf])

  const apiFetch = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const call = (token: string | null) => apiRequest(`${API}/api/${path.replace(/^\//, '')}`, {
      ...init, credentials: 'include', headers: { ...Object.fromEntries(new Headers(init.headers).entries()), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    let response = await call(accessToken.current)
    if (response.status === 401) {
      try { response = await call(await renew()) } catch { accessToken.current = null; setUser(null); throw new Error('Tu sesión venció. Inicia sesión nuevamente.') }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string }
      throw new Error(body.message ?? 'Ocurrió un error al guardar los datos.')
    }
    return await response.json() as T
  }, [renew])

  return <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, apiFetch }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return value
}
