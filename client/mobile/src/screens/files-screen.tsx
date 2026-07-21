import { View, Text, FlatList, StyleSheet } from "react-native"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

interface FileEntry { id: string; name: string; type: string; size: number }

export function FilesScreen() {
  const [files, setFiles] = useState<FileEntry[]>([])

  useEffect(() => {
    api<FileEntry[]>("/api/uploads").then(setFiles).catch(() => {})
  }, [])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Files</Text>
      </View>
      <FlatList
        data={files}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <View style={s.item}>
            <Text style={s.fileIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>{item.type} · {(item.size / 1024).toFixed(1)} KB</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No files shared yet</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1116" },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  title: { fontSize: 20, fontWeight: "600", color: "#F0F0F0" },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#2A2F3A" },
  fileIcon: { fontSize: 24, marginRight: 12 },
  name: { color: "#F0F0F0", fontSize: 15 },
  meta: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 40, fontSize: 14 },
})
