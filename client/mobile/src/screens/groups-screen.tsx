import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

interface Group {
  id: string
  name: string | null
}

export function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    api<Group[]>("/api/conversations")
      .then((convs) => {
        setGroups(convs.filter((c: any) => c.type === "group"))
      })
      .catch(() => {})
  }, [])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Groups</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <View style={s.item}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.name?.[0] ?? "G"}</Text>
            </View>
            <Text style={s.name}>{item.name ?? "Unnamed"}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No groups</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1116" },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  title: { fontSize: 20, fontWeight: "600", color: "#F0F0F0" },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#181B22",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#2A2F3A",
  },
  avatarText: { color: "#F0F0F0", fontSize: 16, fontWeight: "600" },
  name: { color: "#F0F0F0", fontSize: 16 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 40, fontSize: 14 },
})
