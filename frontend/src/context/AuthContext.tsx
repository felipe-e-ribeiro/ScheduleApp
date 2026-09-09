import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../lib/api'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUsername(res.username)
        setStatus('authenticated')
      })
      .catch(() => setStatus('anonymous'))
  }, [])

  const login = useCallback(async (u: string, p: string) => {
    await api.login(u, p)
    setUsername(u)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUsername(null)
    setStatus('anonymous')
  }, [])

  return <AuthContext.Provider value={{ status, username, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
