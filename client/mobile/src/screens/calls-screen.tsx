import { View, Text, FlatList, StyleSheet } from "react-native"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

interface Call {
  id: string
  callerId: string
  calleeId: string
  status: string
  duration: number | null
  createdAt: string
}

export function CallsScreen() {
  const [calls, setCalls] = useState<Call[]>([])

  useEffect(() => {
    api<Call[]>("/api/calls")
      .then(setCalls)
      .catch(() => {})
  }, [])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    if (now.getTime() - d.getTime() < 86400000) return d.toLocaleTimeString()
    return d.toLocaleDateString()
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Recent Calls</Text>
      </View>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={s.item}>
            <Text style={s.icon}>📞</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.callerId === "me" ? "Outgoing" : "Incoming"}</Text>
              <Text style={s.meta}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No call history</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1116" },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  title: { fontSize: 20, fontWeight: "600", color: "#F0F0F0" },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  icon: { fontSize: 22, marginRight: 12 },
  name: { color: "#F0F0F0", fontSize: 15 },
  meta: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 40, fontSize: 14 },
})
