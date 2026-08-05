import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme-context";
import { MessageSquare, Users, Globe, Calendar, Phone } from "lucide-react-native";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  isRead: string;
  createdAt: string;
  type?: string;
  conversationId?: string;
}

const NOTIFICATION_ICONS: Record<string, typeof MessageSquare> = {
  message: MessageSquare,
  group: Users,
  community: Globe,
  event: Calendar,
  call: Phone,
};

export function NotificationsScreen({
  onNavigateToConversation,
}: {
  onNavigateToConversation?: (convId: string) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const load = useCallback(() => {
    api<Notification[]>("/api/notifications")
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const markRead = (id: string) => {
    api(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: "true" } : n)));
  };

  const markAllRead = () => {
    api("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: "true" })));
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const unread = notifications.filter((n) => n.isRead === "false");
  const displayed = tab === "unread" ? unread : notifications;

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
        <Text style={[s.title, { color: c.text }]}>{t("notifications.title")}</Text>
        <View style={s.headerRight}>
          <Text style={[s.count, { color: c.accent }]}>
            {unread.length} {t("notifications.unread")}
          </Text>
          {unread.length > 0 && (
            <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
              <Text style={[s.markAllText, { color: c.accent }]}>{t("notifications.markAllRead")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={[s.filterRow, { borderBottomColor: c.borderLight }]}>
        <TouchableOpacity
          style={[
            s.filterBtn,
            { backgroundColor: c.surfaceAlt },
            tab === "all" && [s.filterActive, { backgroundColor: c.accent }],
          ]}
          onPress={() => setTab("all")}
        >
          <Text style={[s.filterText, { color: c.textSecondary }, tab === "all" && s.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.filterBtn,
            { backgroundColor: c.surfaceAlt },
            tab === "unread" && [s.filterActive, { backgroundColor: c.accent }],
          ]}
          onPress={() => setTab("unread")}
        >
          <Text style={[s.filterText, { color: c.textSecondary }, tab === "unread" && s.filterTextActive]}>
            Unread ({unread.length})
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayed}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        renderItem={({ item }) => {
          const IconComp = NOTIFICATION_ICONS[item.type || ""] || MessageSquare;
          return (
            <TouchableOpacity
              style={[
                s.item,
                { borderBottomColor: c.borderLight },
                item.isRead === "false" && [s.unread, { backgroundColor: c.accentLight }],
              ]}
              onPress={() => {
                markRead(item.id);
                if (item.conversationId) onNavigateToConversation?.(item.conversationId);
              }}
            >
              <View style={[s.iconWrap, { backgroundColor: c.accentLight }]}>
                <IconComp size={16} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.titleText, { color: c.text }]}>{item.title}</Text>
                {item.body && <Text style={[s.body, { color: c.textSecondary }]}>{item.body}</Text>}
                <Text style={[s.time, { color: c.textMuted }]}>{formatTime(item.createdAt)}</Text>
              </View>
              {item.isRead === "false" && <View style={[s.dot, { backgroundColor: c.accent }]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={[s.empty, { color: c.textMuted }]}>{t("notifications.noNotifications")}</Text>}
      />
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
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  count: { fontSize: 13 },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText: { fontSize: 12, fontWeight: "500" },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  unread: {},
  titleText: { fontSize: 15, fontWeight: "500" },
  body: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 11, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 12 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  filterActive: {},
  filterText: { fontSize: 13 },
  filterTextActive: { color: "#FFFFFF", fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 60, fontSize: 15 },
});
