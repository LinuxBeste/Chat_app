import { useState, useEffect } from "react"
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth-context"

interface Conv { id: string; type: string; name: string | null }

export function ConversationsScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [convs, setConvs] = useState<Conv[]>([])
  const { logout } = useAuth()

  useEffect(() => { api<Conv[]>("/api/conversations").then(setConvs).catch(() => {}) }, [])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Chats</Text>
        <TouchableOpacity onPress={logout}><Text style={s.logout}>Logout</Text></TouchableOpacity>
      </View>
      <FlatList
        data={convs}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => onSelect(item.id)}>
            <View style={s.avatar}><Text style={s.avatarText}>{item.name?.[0] ?? "?"}</Text></View>
            <Text style={s.name}>{item.name ?? item.type}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1116" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  title: { fontSize: 20, fontWeight: "600", color: "#F0F0F0" },
  logout: { color: "#EF4444", fontSize: 14 },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#181B22", justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: "#2A2F3A" },
  avatarText: { color: "#F0F0F0", fontSize: 16, fontWeight: "600" },
  name: { color: "#F0F0F0", fontSize: 16 },
})
