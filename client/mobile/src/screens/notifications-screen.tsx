import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

interface Notification {
  id: string
  title: string
  body: string | null
  isRead: string
  createdAt: string
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    api<Notification[]>("/api/notifications").then(setNotifications).catch(() => {})
  }, [])

  const markRead = (id: string) => {
    api(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: "true" } : n))
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

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        <Text style={s.count}>{unread.length} unread</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.item, item.isRead === "false" && s.unread]}
            onPress={() => markRead(item.id)}
            disabled={item.isRead === "true"}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.titleText}>{item.title}</Text>
              {item.body && <Text style={s.body}>{item.body}</Text>}
              <Text style={s.time}>{formatTime(item.createdAt)}</Text>
            </View>
            {item.isRead === "false" && <View style={s.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>No notifications</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1116" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  title: { fontSize: 20, fontWeight: "600", color: "#F0F0F0" },
  count: { color: "#4850BB", fontSize: 13 },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  unread: { backgroundColor: "rgba(72,80,187,0.05)" },
  titleText: { color: "#F0F0F0", fontSize: 15, fontWeight: "500" },
  body: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },
  time: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4850BB", marginLeft: 12 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 40, fontSize: 14 },
})
