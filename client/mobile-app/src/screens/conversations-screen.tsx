import { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { wsClient } from "../lib/ws";
import { cacheGet, cacheSet, offlineKeys } from "../lib/offline-cache";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme-context";
import { AvatarImage } from "../components/ui/avatar-image";
import { Search, Plus, X } from "lucide-react-native";

interface Conv {
  id: string;
  type: string;
  name: string | null;
  avatar?: string;
  lastMessage?: { content: string; createdAt: string; sender: { username: string; displayName?: string } } | null;
  participants?: { id: string; username: string; avatar?: string; status?: string }[];
  otherUser?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    status?: string;
    customStatus?: string;
  };
  unreadCount?: number;
}

const avatarPalette = ["#5B8DEF", "#38B7DE", "#E542A3", "#1FA855", "#C484FF", "#F27F2F", "#3FC8B4", "#E5A13C"];

const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};

interface SearchUser {
  id: string;
  username: string;
  avatar?: string;
  status?: string;
}

export function ConversationsScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [convs, setConvs] = useState<Conv[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const [showNewDM, setShowNewDM] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const load = useCallback(async () => {
    try {
      const convs = await api<Conv[]>("/api/conversations");
      setConvs(convs);
      cacheSet(offlineKeys.conversations, convs);
    } catch {
      const cached = await cacheGet<Conv[]>(offlineKeys.conversations);
      if (cached) setConvs(cached);
    }
  }, []);

  useEffect(() => {
    cacheGet<Conv[]>(offlineKeys.conversations).then((cached) => {
      if (cached) setConvs(cached);
    });
    load();
  }, [load]);

  useEffect(() => {
    if (convs.length > 0) {
      cacheSet(offlineKeys.conversations, convs);
    }
  }, [convs]);

  useEffect(() => {
    if (userSearchQuery.length < 2) {
      setUserResults([]);
      return;
    }
    setSearchingUsers(true);
    const timer = setTimeout(() => {
      api<SearchUser[]>(`/api/users/search?q=${encodeURIComponent(userSearchQuery)}`)
        .then((users) => setUserResults(users.filter((u) => u.id !== user!.id)))
        .catch(() => {})
        .finally(() => setSearchingUsers(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

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
              const aTime = a.lastMessage?.createdAt || "";
              const bTime = b.lastMessage?.createdAt || "";
              return bTime.localeCompare(aTime);
            }),
        );
      }
    });
    const unsub2 = wsClient.on("_connected", load);
    return () => {
      unsub1();
      unsub2();
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startDM = async (userId: string) => {
    try {
      const conv = await api<any>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: [userId] }),
      });
      setShowNewDM(false);
      setUserSearchQuery("");
      setUserResults([]);
      onSelect(conv.id);
    } catch {}
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  const dms = convs.filter((c) => c.type === "dm");
  const filtered = searchQuery
    ? dms.filter((c) => {
        const searchable = c.type === "dm" ? (c.otherUser?.displayName ?? c.otherUser?.username ?? "") : c.name || "";
        return searchable.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : dms;

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[s.title, { color: c.text }]}>{t("chat.chats")}</Text>
        <TouchableOpacity onPress={() => setShowNewDM(true)} style={[s.addBtn, { backgroundColor: c.surface }]}>
          <Plus size={20} color={c.text} />
        </TouchableOpacity>
      </View>
      <View style={[s.searchRow, { backgroundColor: c.inputBg, borderColor: c.border }]}>
        <Search size={16} color={c.textMuted} />
        <TextInput
          style={[s.searchInput, { color: c.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.item, { borderBottomColor: c.borderLight }]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <View style={s.avatarWrap}>
              {item.avatar ? (
                <AvatarImage uri={item.avatar} style={s.avatar} />
              ) : (
                <View
                  style={[s.avatar, { backgroundColor: avatarColor(item.name || item.otherUser?.username || "?") }]}
                >
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
                  const statusColors: Record<string, string> = {
                    online: c.success,
                    away: c.warning,
                    busy: c.danger,
                  };
                  return (
                    <View
                      style={[s.statusDot, { backgroundColor: statusColors[item.otherUser!.status] || c.textMuted }]}
                    />
                  );
                })()}
            </View>
            <View style={s.itemContent}>
              <View style={s.itemTop}>
                <Text
                  style={[s.name, { color: c.text }, (item.unreadCount ?? 0) > 0 && s.nameUnread]}
                  numberOfLines={1}
                >
                  {item.name ||
                    (item.type === "dm"
                      ? (item.otherUser?.displayName ?? item.otherUser?.username ?? "User")
                      : item.type === "group"
                        ? "Group"
                        : "User")}
                </Text>
                {item.lastMessage && (
                  <Text style={[s.time, { color: c.textMuted }]}>{formatTime(item.lastMessage.createdAt)}</Text>
                )}
              </View>
              <Text
                style={[
                  s.lastMsg,
                  { color: c.textSecondary },
                  (item.unreadCount ?? 0) > 0 && [s.lastMsgUnread, { color: c.text }],
                ]}
                numberOfLines={1}
              >
                {item.lastMessage
                  ? `${item.lastMessage.sender.displayName ?? item.lastMessage.sender.username}: ${item.lastMessage.content.replace(/^e2ee:/, "🔒 ")}`
                  : item.type === "dm" && item.otherUser?.customStatus
                    ? item.otherUser.customStatus
                    : t("chat.noMessages")}
              </Text>
            </View>
            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={[s.unreadBadge, { backgroundColor: c.accent }]}>
                <Text style={s.unreadText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[s.empty, { color: c.textMuted }]}>
            {searchQuery ? "No matches" : t("chat.noConversations")}
          </Text>
        }
      />

      <Modal visible={showNewDM} transparent animationType="slide" onRequestClose={() => setShowNewDM(false)}>
        <View style={s.modalContainer}>
          <View style={[s.modalContent, { backgroundColor: c.sheetBg }]}>
            <View style={[s.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[s.modalTitle, { color: c.text }]}>New Message</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNewDM(false);
                  setUserSearchQuery("");
                  setUserResults([]);
                }}
              >
                <X size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[s.userSearchRow, { borderBottomColor: c.border }]}>
              <Search size={16} color={c.textMuted} />
              <TextInput
                style={[s.userSearchInput, { color: c.text }]}
                placeholder="Search users..."
                placeholderTextColor={c.textMuted}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoFocus
              />
              {searchingUsers && <ActivityIndicator size="small" color={c.accent} />}
            </View>
            <FlatList
              data={userResults}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.userItem, { borderBottomColor: c.borderLight }]}
                  onPress={() => startDM(item.id)}
                >
                  <View style={[s.userAvatar, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Text style={[s.userAvatarText, { color: c.text }]}>{item.username[0].toUpperCase()}</Text>
                  </View>
                  <Text style={[s.userName, { color: c.text }]}>{item.username}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                userSearchQuery.length >= 2 && !searchingUsers ? (
                  <Text style={[s.empty, { color: c.textMuted }]}>No users found</Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
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
  name: { fontSize: 16, fontWeight: "500", flex: 1 },
  nameUnread: { fontWeight: "700" },
  time: { fontSize: 11, marginLeft: 8 },
  lastMsg: { fontSize: 13, marginTop: 2 },
  lastMsgUnread: { fontWeight: "600" },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 60, fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  userSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  userSearchInput: { flex: 1, fontSize: 14, padding: 4 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  userAvatarText: { fontSize: 16, fontWeight: "600" },
  userName: { fontSize: 15 },
});
