import { useState, useEffect, useCallback } from "react"
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native"
import { api } from "../lib/api"
import { useTranslation } from "react-i18next"
import { MessageSquare, Users, Globe, Calendar, Phone } from "lucide-react-native"

interface Notification {
  id: string
  title: string
  body: string | null
  isRead: string
  createdAt: string
  type?: string
  conversationId?: string
}

const NOTIFICATION_ICONS: Record<string, typeof MessageSquare> = {
  message: MessageSquare,
  group: Users,
  community: Globe,
  event: Calendar,
  call: Phone,
}

export function NotificationsScreen({ onNavigateToConversation }: { onNavigateToConversation?: (convId: string) => void }) {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<"all" | "unread">("all")

  const load = useCallback(() => {
    api<Notification[]>("/api/notifications").then(setNotifications).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false)
  }, [load])

  const markRead = (id: string) => {
    api(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: "true" } : n))
  }

  const markAllRead = () => {
    api("/api/notifications/read-all", { method: "POST" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: "true" })))
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return "just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  const unread = notifications.filter((n) => n.isRead === "false")
  const displayed = tab === "unread" ? unread : notifications

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t("notifications.title")}</Text>
        <View style={s.headerRight}>
          <Text style={s.count}>{unread.length} {t("notifications.unread")}</Text>
          {unread.length > 0 && (
            <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
              <Text style={s.markAllText}>{t("notifications.markAllRead")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={s.filterRow}>
        <TouchableOpacity style={[s.filterBtn, tab === "all" && s.filterActive]} onPress={() => setTab("all")}>
          <Text style={[s.filterText, tab === "all" && s.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.filterBtn, tab === "unread" && s.filterActive]} onPress={() => setTab("unread")}>
          <Text style={[s.filterText, tab === "unread" && s.filterTextActive]}>Unread ({unread.length})</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayed}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C8CFF" />}
        renderItem={({ item }) => {
          const IconComp = NOTIFICATION_ICONS[item.type || ""] || MessageSquare
          return (
            <TouchableOpacity
              style={[s.item, item.isRead === "false" && s.unread]}
              onPress={() => { markRead(item.id); if (item.conversationId) onNavigateToConversation?.(item.conversationId) }}
            >
              <View style={s.iconWrap}>
                <IconComp size={16} color="#6C8CFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.titleText}>{item.title}</Text>
                {item.body && <Text style={s.body}>{item.body}</Text>}
                <Text style={s.time}>{formatTime(item.createdAt)}</Text>
              </View>
              {item.isRead === "false" && <View style={s.dot} />}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={<Text style={s.empty}>{t("notifications.noNotifications")}</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#252538" },
  title: { fontSize: 24, fontWeight: "700", color: "#E8E8F0" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  count: { color: "#6C8CFF", fontSize: 13 },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText: { color: "#6C8CFF", fontSize: 12, fontWeight: "500" },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#252538" },
  unread: { backgroundColor: "rgba(108,140,255,0.05)" },
  titleText: { color: "#E8E8F0", fontSize: 15, fontWeight: "500" },
  body: { color: "#8888A0", fontSize: 13, marginTop: 2 },
  time: { color: "#585870", fontSize: 11, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#6C8CFF", marginLeft: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(108,140,255,0.1)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: "#252538" },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: "#181825" },
  filterActive: { backgroundColor: "#6C8CFF" },
  filterText: { color: "#8888A0", fontSize: 13 },
  filterTextActive: { color: "#FFFFFF", fontWeight: "600" },
  empty: { color: "#585870", textAlign: "center", marginTop: 60, fontSize: 15 },
})
