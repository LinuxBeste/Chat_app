import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api, setTokens, clearTokens, getTokens } from "./api"
import { wsClient } from "./ws"

interface User {
  id: string
  username: string
  email: string
  status?: string
  customStatus?: string
  displayName?: string | null
  emailVerified?: string
  createdAt?: string
  isAdmin?: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  needsSetup: boolean
  login: (login: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  completeSetup: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  const fetchMe = useCallback(async () => {
    try {
      const me = await api<User>("/api/users/me")
      setUser(me)
      wsClient.connect()
    } catch {
      clearTokens()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const { accessToken } = getTokens()
    if (accessToken) {
      fetchMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  const login = useCallback(async (login: string, password: string) => {
    const data = await api<{ user: User; accessToken: string; refreshToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    wsClient.connect()
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await api<{ user: User; accessToken: string; refreshToken: string; needsSetup?: boolean }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    wsClient.connect()
    if (data.needsSetup) setNeedsSetup(true)
  }, [])

  const completeSetup = useCallback(() => {
    setNeedsSetup(false)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    wsClient.disconnect()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, needsSetup, login, register, logout, completeSetup }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
