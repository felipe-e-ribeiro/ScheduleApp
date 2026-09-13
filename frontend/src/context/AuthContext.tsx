import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import type { UserRole } from '../lib/types'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  username: string | null
  role: UserRole | null
  isAdmin: boolean
  telegramLinked: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [telegramLinked, setTelegramLinked] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await api.me()
      setUsername(res.username)
      setRole(res.role)
      setTelegramLinked(res.telegram_linked)
      setStatus('authenticated')
    } catch {
      setUsername(null)
      setRole(null)
      setTelegramLinked(false)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (u: string, p: string) => {
    await api.login(u, p)
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUsername(null)
    setRole(null)
    setTelegramLinked(false)
    setStatus('anonymous')
  }, [])

  return (
    <AuthContext.Provider
      value={{ status, username, role, isAdmin: role === 'admin', telegramLinked, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
