import { useState, useEffect, useCallback } from "react"
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Phone, PhoneIncoming, PhoneMissed } from "lucide-react-native"

interface Call {
  id: string
  callerId: string
  calleeId: string
  status: string
  duration: number | null
  createdAt: string
}

export function CallsScreen({ onStartCall }: { onStartCall?: (userId: string) => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const { user } = useAuth()
  const [calls, setCalls] = useState<Call[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(() => {
    api<Call[]>("/api/calls")
      .then(setCalls)
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    if (now.getTime() - d.getTime() < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return d.toLocaleDateString()
  }

  const getCallInfo = (call: Call) => {
    const me = user?.id
    if (call.callerId === me) return { label: t("calls.outgoing"), color: "#22C55E" }
    if (call.calleeId === me && call.status !== "missed") return { label: t("calls.incoming"), color: "#22C55E" }
    if (call.calleeId === me) return { label: t("calls.missed"), color: "#EF4444" }
    return { label: t("calls.missed"), color: "#EF4444" }
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>{t("calls.title")}</Text>
      </View>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C8CFF" />}
        renderItem={({ item }) => {
          const info = getCallInfo(item)
          const isOutgoing = item.callerId === user?.id
          const CallIcon = isOutgoing ? Phone : item.status === "missed" ? PhoneMissed : PhoneIncoming
          return (
            <View style={s.item}>
              <View style={[s.iconWrap, item.status === "missed" && s.missedIcon]}>
                <CallIcon size={18} color={item.status === "missed" ? "#EF4444" : "#22C55E"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{info.label}</Text>
                <Text style={s.meta}>
                  {formatTime(item.createdAt)}
                  {item.duration
                    ? ` · ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, "0")}`
                    : ""}
                </Text>
              </View>
              <Text style={[s.status, { color: info.color }]}>{item.status}</Text>
              <TouchableOpacity
                style={{ marginLeft: 8, padding: 8 }}
                onPress={() => onStartCall?.(item.callerId === user?.id ? item.calleeId : item.callerId)}
              >
                <Phone size={16} color="#6C8CFF" />
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={<Text style={s.empty}>{t("calls.noCalls")}</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#252538" },
  title: { fontSize: 24, fontWeight: "700", color: "#E8E8F0" },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#252538" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(34,197,94,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  missedIcon: { backgroundColor: "rgba(239,68,68,0.1)" },
  name: { color: "#E8E8F0", fontSize: 15, fontWeight: "500" },
  meta: { color: "#585870", fontSize: 12, marginTop: 2 },
  status: { fontSize: 12, fontWeight: "500" },
  empty: { color: "#585870", textAlign: "center", marginTop: 60, fontSize: 15 },
})
