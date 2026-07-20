import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api, setTokens, clearTokens, getTokens } from "./api"
import { wsClient } from "./ws"

interface User {
  id: string
  username: string
  email: string
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    )
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    wsClient.connect()
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await api<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ username, email, password }) },
    )
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    wsClient.connect()
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    wsClient.disconnect()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
