import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api, setTokens, clearTokens, getTokens, NetworkError } from "./api"
import { wsClient } from "./ws"
import { getOrCreateKeyPair, getOrCreateDeviceId } from "./crypto"
import { cacheCurrentUser, getCachedCurrentUser, clearCachedCurrentUser } from "./offline"
import { isDesktop } from "./utils"

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
  offline: boolean
  retry: () => void
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
  const [offline, setOffline] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  const syncKey = useCallback(async (userId?: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [kp, deviceId] = await Promise.all([getOrCreateKeyPair(userId), getOrCreateDeviceId(userId)])
        await api("/api/e2ee/key", {
          method: "PUT",
          body: JSON.stringify({ key: kp.publicKey, deviceId }),
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
      setOffline(false)
      if (isDesktop()) cacheCurrentUser(me)
      wsClient.connect()
      await syncKey(me.id)
    } catch (err) {
      if (isDesktop()) {
        const cached = getCachedCurrentUser() as User | null
        if (err instanceof NetworkError) {
          setOffline(true)
        }
        if (cached) {
          setUser(cached)
          wsClient.connect()
          await syncKey(cached.id)
        }
      }
    }
  }, [syncKey])

  const retry = useCallback(() => {
    setOffline(false)
    setLoading(true)
    fetchMe().finally(() => setLoading(false))
  }, [fetchMe])

  useEffect(() => {
    const { accessToken } = getTokens()
    if (accessToken) {
      if (isDesktop()) {
        const cached = getCachedCurrentUser() as User | null
        if (cached) {
          setUser(cached)
          setLoading(false)
        }
      }
      fetchMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  const login = useCallback(
    async (login: string, password: string) => {
      const data = await api<{ user: User; accessToken: string; refreshToken: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      })
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      if (isDesktop()) cacheCurrentUser(data.user)
      wsClient.connect()
      await syncKey(data.user.id)
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
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      if (isDesktop()) cacheCurrentUser(data.user)
      wsClient.connect()
      await syncKey(data.user.id)
      if (data.needsSetup) setNeedsSetup(true)
    },
    [syncKey],
  )

  const completeSetup = useCallback(() => {
    setNeedsSetup(false)
  }, [])

  // Keep the device keypair on logout so messages stay decryptable after re-login.
  const logout = useCallback(() => {
    clearTokens()
    clearCachedCurrentUser()
    wsClient.disconnect()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, offline, retry, needsSetup, login, register, logout, completeSetup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
