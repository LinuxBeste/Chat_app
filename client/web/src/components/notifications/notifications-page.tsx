import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { useNotificationCount } from "../../lib/notification-context"
import { Bell, CheckCheck, MessageSquare, Users, Calendar, Globe } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  isRead: string
  createdAt: string
}

const iconMap: Record<string, any> = {
  message: MessageSquare,
  group: Users,
  event: Calendar,
  community: Globe,
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { refresh } = useNotificationCount()

  useEffect(() => {
    api<Notification[]>("/api/notifications").then(setNotifications).catch(() => {})
  }, [])

  const markRead = async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: "true" } : n))
    refresh()
  }

  const markAllRead = async () => {
    await api("/api/notifications/read-all", { method: "POST" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: "true" })))
    refresh()
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return "just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const unread = notifications.filter((n) => n.isRead === "false")
  const read = notifications.filter((n) => n.isRead === "true")

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Notifications</h2>
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 h-8 rounded-2xl bg-accent/10 text-accent text-xs px-3 font-medium hover:bg-accent/20 transition-all cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {unread.length > 0 && (
            <div className="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">Unread</div>
          )}
          {unread.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all cursor-pointer hover:bg-accent/[0.02] border-b border-border/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0 mt-0.5">
                {(iconMap[n.type] ?? Bell)({ className: "h-4 w-4" })}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                {n.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-accent mt-1">{formatTime(n.createdAt)}</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
            </button>
          ))}
          {read.length > 0 && (
            <div className="px-4 py-2 mt-2 text-xs font-medium text-text-muted uppercase tracking-wider">Earlier</div>
          )}
          {read.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 px-4 py-3.5 border-b border-border/50 opacity-60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-text-muted shrink-0 mt-0.5">
                {(iconMap[n.type] ?? Bell)({ className: "h-4 w-4" })}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary">{n.title}</p>
                {n.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-text-muted mt-1">{formatTime(n.createdAt)}</p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-text-muted">
              <Bell className="h-8 w-8" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
