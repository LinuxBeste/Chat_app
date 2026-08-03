import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal } from "react-native"
import { api } from "../lib/api"
import { useTheme } from "../lib/theme-context"

interface User {
  id: string
  username: string
  displayName?: string
}

interface AddParticipantsModalProps {
  visible: boolean
  conversationId: string
  onClose: () => void
}

export function AddParticipantsModal({ visible, conversationId, onClose }: AddParticipantsModalProps) {
  const { c } = useTheme()
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<User[]>([])

  const searchUsers = async (q: string) => {
    setSearch(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    try {
      const data = await api<User[]>(`/api/users/search?q=${encodeURIComponent(q)}`)
      setResults(data)
    } catch {
      setResults([])
    }
  }

  const addParticipant = async (userId: string) => {
    try {
      await api(`/api/conversations/${conversationId}/participants`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      })
    } catch {}
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
          <Text style={[s.title, { color: c.text }]}>Add Participants</Text>
          <TextInput
            style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
            placeholder="Search users..."
            placeholderTextColor={c.textMuted}
            value={search}
            onChangeText={searchUsers}
          />
          <FlatList
            data={results}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.item, { borderBottomColor: c.borderLight }]}
                onPress={() => addParticipant(item.id)}
              >
                <Text style={[s.name, { color: c.text }]}>{item.displayName || item.username}</Text>
                <Text style={[s.addBtn, { color: c.accent }]}>+ Add</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 300 }}
          />
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={[s.closeText, { color: c.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  name: { fontSize: 15 },
  addBtn: { fontSize: 14, fontWeight: "600" },
  closeBtn: { marginTop: 16, alignItems: "center", padding: 8 },
  closeText: { fontSize: 15 },
})
