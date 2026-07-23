import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api, getTokens } from "./api"

interface NotificationContextValue {
  unreadCount: number
  refresh: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    if (!getTokens().accessToken) return
    api<{ count: number }>("/api/notifications/unread-count")
      .then((d) => setUnreadCount(d.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return <NotificationContext.Provider value={{ unreadCount, refresh }}>{children}</NotificationContext.Provider>
}

export function useNotificationCount() {
  const ctx = useContext(NotificationContext)
  if (!ctx) return { unreadCount: 0, refresh: () => {} }
  return ctx
}
