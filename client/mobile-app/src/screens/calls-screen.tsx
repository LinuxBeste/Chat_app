import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Phone, PhoneIncoming, PhoneMissed, Video, User } from "lucide-react-native";

interface Call {
  id: string;
  callerId: string;
  calleeId: string;
  status: string;
  duration: number | null;
  createdAt: string;
  type?: string;
}

const AVATAR_COLORS = ["#E5A13C", "#38B7DE", "#E542A3", "#1FA855", "#C484FF", "#F27F2F", "#3FC8B4", "#5B9BD5"];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function CallsScreen({ onStartCall }: { onStartCall?: (userId: string) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api<Call[]>("/api/calls")
      .then(setCalls)
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (now.getTime() - d.getTime() < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString();
  };

  const getCallInfo = (call: Call) => {
    const me = user?.id;
    if (call.callerId === me) return { label: t("calls.outgoing"), color: "#22C55E" };
    if (call.calleeId === me && call.status !== "missed") return { label: t("calls.incoming"), color: "#22C55E" };
    if (call.calleeId === me) return { label: t("calls.missed"), color: "#EF4444" };
    return { label: t("calls.missed"), color: "#EF4444" };
  };

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
        <Text style={[s.title, { color: c.text }]}>{t("calls.title")}</Text>
      </View>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        renderItem={({ item }) => {
          const info = getCallInfo(item);
          const isOutgoing = item.callerId === user?.id;
          const peerId = isOutgoing ? item.calleeId : item.callerId;
          const CallIcon = isOutgoing ? Phone : item.status === "missed" ? PhoneMissed : PhoneIncoming;
          const isVideo = item.type === "video";
          return (
            <View style={[s.item, { borderBottomColor: c.borderLight }]}>
              <View style={[s.avatar, { backgroundColor: colorFor(peerId) }]}>
                <User size={18} color="#FFFFFF" />
                <View style={[s.callTypeBadge, { backgroundColor: item.status === "missed" ? "#EF4444" : "#22C55E" }]}>
                  {isVideo ? <Video size={10} color="#FFFFFF" /> : <CallIcon size={10} color="#FFFFFF" />}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: c.text }]}>{info.label}</Text>
                <Text style={[s.meta, { color: c.textMuted }]}>
                  {formatTime(item.createdAt)}
                  {item.duration
                    ? ` · ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, "0")}`
                    : ""}
                </Text>
              </View>
              <Text style={[s.status, { color: info.color }]}>{item.status}</Text>
              <TouchableOpacity
                style={[s.callBtn, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}
                onPress={() => onStartCall?.(peerId)}
                activeOpacity={0.7}
              >
                <Phone size={16} color={c.accent} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={[s.empty, { color: c.textMuted }]}>{t("calls.noCalls")}</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4 },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  callTypeBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0A0A0F",
  },
  name: { fontSize: 15, fontWeight: "500" },
  meta: { fontSize: 12, marginTop: 2 },
  status: { fontSize: 12, fontWeight: "500", textTransform: "capitalize" },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginLeft: 10,
  },
  empty: { textAlign: "center", marginTop: 60, fontSize: 15 },
});
