import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { wsClient } from "../lib/ws"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Search, Plus, X } from "lucide-react-native"

interface Conv {
  id: string
  type: string
  name: string | null
  avatar?: string
  lastMessage?: { content: string; createdAt: string; sender: { username: string; displayName?: string } } | null
  participants?: { id: string; username: string; avatar?: string; status?: string }[]
  otherUser?: {
    id: string
    username: string
    displayName?: string
    avatar?: string
    status?: string
    customStatus?: string
  }
  unreadCount?: number
}

interface SearchUser {
  id: string
  username: string
  avatar?: string
  status?: string
}

export function ConversationsScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const [convs, setConvs] = useState<Conv[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { logout, user } = useAuth()
  const [showNewDM, setShowNewDM] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const load = useCallback(() => {
    api<Conv[]>("/api/conversations")
      .then(setConvs)
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (userSearchQuery.length < 2) {
      setUserResults([])
      return
    }
    setSearchingUsers(true)
    const timer = setTimeout(() => {
      api<SearchUser[]>(`/api/users/search?q=${encodeURIComponent(userSearchQuery)}`)
        .then((users) => setUserResults(users.filter((u) => u.id !== user!.id)))
        .catch(() => {})
        .finally(() => setSearchingUsers(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearchQuery])

  useEffect(() => {
    const unsub1 = wsClient.on("message:new", (data: any) => {
      if (data.conversationId) {
        setConvs((prev) =>
          prev
            .map((c) =>
              c.id === data.conversationId
                ? {
                    ...c,
                    lastMessage: {
                      content: data.content,
                      createdAt: data.createdAt,
                      sender: { username: data.sender?.username || "" },
                    },
                  }
                : c,
            )
            .sort((a, b) => {
              const aTime = a.lastMessage?.createdAt || ""
              const bTime = b.lastMessage?.createdAt || ""
              return bTime.localeCompare(aTime)
            }),
        )
      }
    })
    const unsub2 = wsClient.on("_connected", load)
    return () => {
      unsub1()
      unsub2()
    }
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const startDM = async (userId: string) => {
    try {
      const conv = await api<any>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: [userId] }),
      })
      setShowNewDM(false)
      setUserSearchQuery("")
      setUserResults([])
      onSelect(conv.id)
    } catch {}
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return "now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString()
  }

  const filtered = searchQuery
    ? convs.filter((c) => {
        const searchable = c.type === "dm" ? (c.otherUser?.displayName ?? c.otherUser?.username ?? "") : c.name || ""
        return searchable.toLowerCase().includes(searchQuery.toLowerCase())
      })
    : convs

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>{t("chat.chats")}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <TouchableOpacity onPress={() => setShowNewDM(true)} style={s.addBtn}>
            <Plus size={20} color="#E8E8F0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={s.logout}>{t("nav.logout")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.searchRow}>
        <Search size={16} color="#585870" />
        <TextInput
          style={s.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#585870"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C8CFF" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => onSelect(item.id)}>
            <View style={s.avatarWrap}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={s.avatar} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {item.type === "dm"
                      ? (item.otherUser?.displayName?.[0] ?? item.otherUser?.username?.[0] ?? "?")
                      : (item.name?.[0] ?? "G")}
                  </Text>
                </View>
              )}
              {item.type === "dm" &&
                item.otherUser?.status &&
                item.otherUser.status !== "offline" &&
                (() => {
                  const statusColors: Record<string, string> = { online: "#22C55E", away: "#EAB308", busy: "#EF4444" }
                  return (
                    <View
                      style={[s.statusDot, { backgroundColor: statusColors[item.otherUser!.status] || "#8888A0" }]}
                    />
                  )
                })()}
            </View>
            <View style={s.itemContent}>
              <View style={s.itemTop}>
                <Text style={s.name} numberOfLines={1}>
                  {item.name ||
                    (item.type === "dm"
                      ? (item.otherUser?.displayName ?? item.otherUser?.username ?? "User")
                      : item.type === "group"
                        ? "Group"
                        : "User")}
                </Text>
                {item.lastMessage && <Text style={s.time}>{formatTime(item.lastMessage.createdAt)}</Text>}
              </View>
              <Text style={s.lastMsg} numberOfLines={1}>
                {item.lastMessage
                  ? `${item.lastMessage.sender.displayName ?? item.lastMessage.sender.username}: ${item.lastMessage.content.replace(/^e2ee:/, "🔒 ")}`
                  : item.type === "dm" && item.otherUser?.customStatus
                    ? item.otherUser.customStatus
                    : t("chat.noMessages")}
              </Text>
            </View>
            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={s.unreadBadge}>
                <Text style={s.unreadText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>{searchQuery ? "No matches" : t("chat.noConversations")}</Text>}
      />

      <Modal visible={showNewDM} transparent animationType="slide" onRequestClose={() => setShowNewDM(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Message</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNewDM(false)
                  setUserSearchQuery("")
                  setUserResults([])
                }}
              >
                <X size={20} color="#8888A0" />
              </TouchableOpacity>
            </View>
            <View style={s.userSearchRow}>
              <Search size={16} color="#585870" />
              <TextInput
                style={s.userSearchInput}
                placeholder="Search users..."
                placeholderTextColor="#585870"
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoFocus
              />
              {searchingUsers && <ActivityIndicator size="small" color="#6C8CFF" />}
            </View>
            <FlatList
              data={userResults}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.userItem} onPress={() => startDM(item.id)}>
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>{item.username[0].toUpperCase()}</Text>
                  </View>
                  <Text style={s.userName}>{item.username}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                userSearchQuery.length >= 2 && !searchingUsers ? <Text style={s.empty}>No users found</Text> : null
              }
            />
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
    borderBottomColor: "#252538",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#E8E8F0" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#252538",
  },
  logoutBtn: { padding: 4 },
  logout: { color: "#EF4444", fontSize: 14, fontWeight: "500" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#252538",
    backgroundColor: "#0A0A0F",
  },
  searchInput: { flex: 1, color: "#E8E8F0", fontSize: 14, padding: 4 },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#252538" },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#252538",
  },
  avatarText: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0A0A0F",
  },
  itemContent: { flex: 1 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: "#E8E8F0", fontSize: 16, fontWeight: "500", flex: 1 },
  time: { color: "#585870", fontSize: 11, marginLeft: 8 },
  lastMsg: { color: "#8888A0", fontSize: 13, marginTop: 2 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6C8CFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  empty: { color: "#585870", textAlign: "center", marginTop: 60, fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#0A0A0F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#252538",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#252538",
  },
  modalTitle: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  userSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#252538",
  },
  userSearchInput: { flex: 1, color: "#E8E8F0", fontSize: 14, padding: 4 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#252538",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#252538",
  },
  userAvatarText: { color: "#E8E8F0", fontSize: 16, fontWeight: "600" },
  userName: { color: "#E8E8F0", fontSize: 15 },
})
