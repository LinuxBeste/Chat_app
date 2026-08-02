import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native"
import { api } from "../lib/api"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Search, Plus, X, Users, MessageSquare } from "lucide-react-native"

interface Group {
  id: string
  name: string | null
  type: string
  participantCount?: number
}

interface UserResult {
  id: string
  username: string
  displayName?: string
}

export function GroupsScreen({ onSelectChat }: { onSelectChat?: (id: string) => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const [groups, setGroups] = useState<Group[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [joinModal, setJoinModal] = useState(false)
  const [inviteCode, setInviteCode] = useState("")

  const load = useCallback(() => {
    api<Group[]>("/api/conversations")
      .then((convs) => {
        setGroups(convs.filter((c: any) => c.type === "group"))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      api<UserResult[]>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then(setSearchResults)
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const createGroup = async () => {
    if (!groupName.trim()) return
    try {
      await api("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "group",
          name: groupName.trim(),
          participantIds: Array.from(selectedParticipants),
        }),
      })
      setGroupName("")
      setSelectedParticipants(new Set())
      setSearchQuery("")
      setModalVisible(false)
      load()
    } catch {}
  }

  const deleteGroup = (id: string) => {
    Alert.alert(t("groups.deleteGroup"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          api(`/api/conversations/${id}`, { method: "DELETE" })
            .then(load)
            .catch(() => {})
        },
      },
    ])
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>{t("groups.title")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={s.createBtn} onPress={() => setModalVisible(true)}>
            <Text style={s.createBtnText}>+ {t("groups.newGroup")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.createBtn} onPress={() => setJoinModal(true)}>
            <Text style={s.createBtnText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C8CFF" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.item}
            onPress={() => onSelectChat?.(item.id)}
            onLongPress={() => deleteGroup(item.id)}
          >
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.name?.[0] ?? "G"}</Text>
            </View>
            <View style={s.itemContent}>
              <Text style={s.name}>{item.name ?? "Unnamed"}</Text>
              {item.participantCount !== undefined && <Text style={s.meta}>{item.participantCount} members</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>{t("groups.noGroups")}</Text>}
      />
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t("groups.newGroup")}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false)
                  setSelectedParticipants(new Set())
                  setSearchQuery("")
                }}
              >
                <X size={20} color="#8888A0" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.modalInput}
              placeholder="Group name"
              placeholderTextColor="#585870"
              value={groupName}
              onChangeText={setGroupName}
            />
            <View style={s.searchRow}>
              <Search size={16} color="#585870" />
              <TextInput
                style={s.searchInput}
                placeholder="Search users to add..."
                placeholderTextColor="#585870"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searching && <ActivityIndicator size="small" color="#6C8CFF" />}
            </View>
            {selectedParticipants.size > 0 && (
              <View style={s.chipRow}>
                {Array.from(selectedParticipants).map((id) => {
                  const user = searchResults.find((u) => u.id === id)
                  return (
                    <TouchableOpacity key={id} style={s.chip} onPress={() => toggleParticipant(id)}>
                      <Text style={s.chipText}>{user?.username || id.slice(0, 6)}</Text>
                      <X size={12} color="#E8E8F0" />
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
            <FlatList
              data={searchResults.filter((u) => !selectedParticipants.has(u.id))}
              keyExtractor={(u) => u.id}
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.userItem} onPress={() => toggleParticipant(item.id)}>
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>{item.username[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{item.displayName || item.username}</Text>
                    <Text style={s.userTag}>@{item.username}</Text>
                  </View>
                  <Plus size={18} color="#6C8CFF" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.length >= 2 && !searching ? <Text style={s.empty}>No users found</Text> : null
              }
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false)
                  setSelectedParticipants(new Set())
                  setSearchQuery("")
                }}
                style={s.cancelBtn}
              >
                <Text style={s.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createGroup}
                style={[s.confirmBtn, !groupName.trim() && { opacity: 0.4 }]}
                disabled={!groupName.trim()}
              >
                <Text style={s.confirmText}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={joinModal} transparent animationType="fade" onRequestClose={() => setJoinModal(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Join Group</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Enter invite code"
              placeholderTextColor="#585870"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setJoinModal(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!inviteCode.trim()) return
                  try {
                    await api("/api/conversations/join", {
                      method: "POST",
                      body: JSON.stringify({ code: inviteCode.trim() }),
                    })
                    setJoinModal(false)
                    setInviteCode("")
                    load()
                  } catch {}
                }}
                style={s.confirmBtn}
              >
                <Text style={s.confirmText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A28",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#E8E8F0" },
  createBtn: { backgroundColor: "#6C8CFF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  createBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A28" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  avatarText: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  itemContent: { flex: 1 },
  name: { color: "#E8E8F0", fontSize: 16, fontWeight: "500" },
  meta: { color: "#585870", fontSize: 12, marginTop: 2 },
  empty: { color: "#585870", textAlign: "center", marginTop: 60, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: "#0A0A0F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#1A1A28",
    paddingHorizontal: 20,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  modalTitle: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  modalInput: {
    backgroundColor: "#101016",
    borderRadius: 12,
    padding: 14,
    color: "#E8E8F0",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1A1A28",
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#101016",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1A1A28",
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: "#E8E8F0", fontSize: 14, padding: 0 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#6C8CFF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "500" },
  userItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  userAvatarText: { color: "#E8E8F0", fontSize: 14, fontWeight: "600" },
  userName: { color: "#E8E8F0", fontSize: 14, fontWeight: "500" },
  userTag: { color: "#585870", fontSize: 11 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  cancelText: { color: "#8888A0", fontSize: 15 },
  confirmBtn: { backgroundColor: "#6C8CFF", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
