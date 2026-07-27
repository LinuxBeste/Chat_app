import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api, setTokens, clearTokens, getTokens } from "./api"
import { wsClient } from "./ws"
import { getOrCreateKeyPair, deleteKeyPair } from "./crypto"

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

  const syncKey = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const kp = await getOrCreateKeyPair()
        await api("/api/e2ee/key", {
          method: "PUT",
          body: JSON.stringify({ key: kp.publicKey }),
        })
        return
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }, [])

  const fetchMe = useCallback(async () => {
    try {
      const me = await api<User>("/api/users/me")
      setUser(me)
      wsClient.connect()
      await syncKey()
    } catch {
      clearTokens()
      setUser(null)
    }
  }, [syncKey])

  useEffect(() => {
    getTokens().then((t) => {
      if (t.accessToken) fetchMe().finally(() => setLoading(false))
      else setLoading(false)
    })
  }, [fetchMe])

  const login = useCallback(
    async (login: string, password: string) => {
      const data = await api<{ user: User; accessToken: string; refreshToken: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      })
      await setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      wsClient.connect()
      await syncKey()
    },
    [syncKey],
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api<{ user: User; accessToken: string; refreshToken: string; needsSetup?: boolean }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ username, email, password }),
        },
      )
      await setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      wsClient.connect()
      await syncKey()
      if (data.needsSetup) setNeedsSetup(true)
    },
    [syncKey],
  )

  const completeSetup = useCallback(() => setNeedsSetup(false), [])

  const logout = useCallback(async () => {
    await clearTokens()
    wsClient.disconnect()
    setUser(null)
    try {
      await deleteKeyPair()
    } catch {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, needsSetup, login, register, logout, completeSetup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
