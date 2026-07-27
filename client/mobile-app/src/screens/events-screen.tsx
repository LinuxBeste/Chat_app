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
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native"
import { Calendar, Plus, X, ChevronRight, MessageSquare, Clock } from "lucide-react-native"
import { api } from "../lib/api"
import { useTheme } from "../lib/theme-context"
import { useTranslation } from "react-i18next"
import { wsClient } from "../lib/ws"
import DateTimePicker from "@react-native-community/datetimepicker"

interface Event {
  id: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  creatorId: string
  conversationId?: string
  conversationName?: string
  myRsvp?: string | null
  rsvpCount?: { going: number; maybe: number; declined: number }
}

interface Conv {
  id: string
  name: string | null
  type: string
}

export function EventsScreen({ onSelectChat }: { onSelectChat?: (id: string) => void }) {
  const { t } = useTranslation()
  const { c } = useTheme()
  const [events, setEvents] = useState<Event[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming")
  const [modalVisible, setModalVisible] = useState(false)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [startsAt, setStartsAt] = useState(new Date())
  const [endsAt, setEndsAt] = useState<Date | null>(null)
  const [convId, setConvId] = useState("")
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [convs, setConvs] = useState<Conv[]>([])
  const [showConvPicker, setShowConvPicker] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    api<Event[]>("/api/events")
      .then(setEvents)
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const unsub = wsClient.on("event:new", load)
    return () => unsub()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => {
    api<Conv[]>("/api/conversations")
      .then(setConvs)
      .catch(() => {})
  }, [])

  const create = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify({
          conversationId: convId || "00000000-0000-0000-0000-000000000000",
          title: title.trim(),
          description: desc.trim() || undefined,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt?.toISOString() || undefined,
        }),
      })
      setTitle("")
      setDesc("")
      setStartsAt(new Date())
      setEndsAt(null)
      setConvId("")
      setModalVisible(false)
      load()
    } catch {}
    setCreating(false)
  }

  const deleteEvent = (eventId: string) => {
    Alert.alert("Delete Event", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          api(`/api/events/${eventId}`, { method: "DELETE" })
            .then(load)
            .catch(() => {})
        },
      },
    ])
  }

  const rsvp = async (eventId: string, status: "going" | "maybe" | "declined") => {
    try {
      await api(`/api/events/${eventId}/rsvp`, { method: "POST", body: JSON.stringify({ status }) })
      load()
    } catch {}
  }

  const filtered = events.filter((e) => {
    const isPast = new Date(e.startsAt) < new Date()
    return filter === "upcoming" ? !isPast : isPast
  })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const isToday = d.toDateString() === now.toDateString()
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString()
    const day = isToday
      ? "Today"
      : isTomorrow
        ? "Tomorrow"
        : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    return `${day} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return null
    const s = new Date(start)
    const e = new Date(end)
    const ms = e.getTime() - s.getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const RSVP_LABELS = { going: "👍 Going", maybe: "🤷 Maybe", declined: "👎 Decline" } as const

  return (
    <View style={[st.container, { backgroundColor: c.bg }]}>
      <View style={[st.header, { borderBottomColor: c.borderLight }]}>
        <Text style={[st.title, { color: c.text }]}>Events</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[st.createBtn, { backgroundColor: c.accent }]} onPress={() => setModalVisible(true)}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={st.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[st.filterRow, { borderBottomColor: c.borderLight }]}>
        <TouchableOpacity
          style={[st.filterBtn, { backgroundColor: filter === "upcoming" ? c.accent : c.surfaceAlt }]}
          onPress={() => setFilter("upcoming")}
        >
          <Text style={[st.filterText, { color: filter === "upcoming" ? "#FFFFFF" : c.textSecondary }]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.filterBtn, { backgroundColor: filter === "past" ? c.accent : c.surfaceAlt }]}
          onPress={() => setFilter("past")}
        >
          <Text style={[st.filterText, { color: filter === "past" ? "#FFFFFF" : c.textSecondary }]}>Past</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const duration = formatDuration(item.startsAt, item.endsAt)
          return (
            <TouchableOpacity
              style={[st.eventItem, { borderBottomColor: c.borderLight }]}
              activeOpacity={item.conversationId ? 0.6 : 1}
              onPress={item.conversationId && onSelectChat ? () => onSelectChat(item.conversationId!) : undefined}
            >
              <View style={st.eventTop}>
                <Calendar size={16} color={c.accent} />
                <Text style={[st.eventTitle, { color: c.text }]}>{item.title}</Text>
                {item.conversationId && onSelectChat && (
                  <TouchableOpacity onPress={() => onSelectChat(item.conversationId!)} style={{ marginLeft: 4 }}>
                    <MessageSquare size={14} color={c.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={{ marginLeft: "auto" }} onPress={() => deleteEvent(item.id)}>
                  <Text style={{ color: c.danger, fontSize: 11 }}>Delete</Text>
                </TouchableOpacity>
              </View>
              <View style={[st.eventMeta, { marginTop: 6 }]}>
                <Clock size={12} color={c.textMuted} />
                <Text style={[st.eventDate, { color: c.textMuted }]}>{formatDate(item.startsAt)}</Text>
                {duration && <Text style={[st.eventDuration, { color: c.textMuted }]}>({duration})</Text>}
              </View>
              {item.conversationName && (
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>#{item.conversationName}</Text>
              )}
              {item.description ? (
                <Text style={[st.eventDesc, { color: c.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              {item.rsvpCount && (
                <View style={st.rsvpCounts}>
                  {Object.entries(item.rsvpCount).map(([k, v]) => (
                    <Text key={k} style={{ color: c.textMuted, fontSize: 12 }}>
                      {k === "going" ? "👍" : k === "maybe" ? "🤷" : "👎"} {v}
                    </Text>
                  ))}
                </View>
              )}
              {filter === "upcoming" && (
                <View style={st.rsvpRow}>
                  {(["going", "maybe", "declined"] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        st.rsvpBtn,
                        {
                          borderColor: c.border,
                          backgroundColor: item.myRsvp === status ? c.accentLight : c.surfaceAlt,
                        },
                        item.myRsvp === status && { borderColor: c.accent },
                      ]}
                      onPress={() => rsvp(item.id, status)}
                    >
                      <Text style={[st.rsvpBtnText, item.myRsvp === status && { color: c.accent, fontWeight: "600" }]}>
                        {RSVP_LABELS[status]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 80 }}>
            <Calendar size={48} color={c.textMuted} />
            <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 12 }}>No {filter} events</Text>
            <TouchableOpacity
              style={[st.createBtn, { backgroundColor: c.accent, marginTop: 16 }]}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={st.createBtnText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}
            >
              <Text style={[st.modalTitle, { color: c.text }]}>Create Event</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder="Event title"
              placeholderTextColor={c.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[
                st.modalInput,
                st.modalTextArea,
                { backgroundColor: c.inputBg, color: c.text, borderColor: c.border },
              ]}
              placeholder="Description (optional)"
              placeholderTextColor={c.textMuted}
              value={desc}
              onChangeText={setDesc}
              multiline
            />
            <TouchableOpacity
              style={[
                st.modalInput,
                {
                  backgroundColor: c.inputBg,
                  borderColor: c.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
              onPress={() => setShowConvPicker(true)}
            >
              <Text style={{ color: convId ? c.text : c.textMuted, fontSize: 15 }}>
                {convId ? convs.find((c) => c.id === convId)?.name || "Selected" : "Link to conversation (optional)"}
              </Text>
              <ChevronRight size={16} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                st.modalInput,
                {
                  backgroundColor: c.inputBg,
                  borderColor: c.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
              onPress={() => setShowStartPicker(true)}
            >
              <Calendar size={16} color={c.accent} />
              <Text style={{ color: c.text, fontSize: 15 }}>
                {startsAt.toLocaleDateString()}{" "}
                {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                st.modalInput,
                {
                  backgroundColor: c.inputBg,
                  borderColor: c.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
              onPress={() => setShowEndPicker(true)}
            >
              <Clock size={16} color={c.textMuted} />
              <Text style={{ color: endsAt ? c.text : c.textMuted, fontSize: 15 }}>
                {endsAt
                  ? `End: ${endsAt.toLocaleDateString()} ${endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "End time (optional)"}
              </Text>
            </TouchableOpacity>
            {endsAt && (
              <TouchableOpacity onPress={() => setEndsAt(null)}>
                <Text style={{ color: c.danger, fontSize: 13, textAlign: "center", marginBottom: 8 }}>
                  Clear end time
                </Text>
              </TouchableOpacity>
            )}
            {showStartPicker && (
              <DateTimePicker
                value={startsAt}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_: any, date?: Date) => {
                  setShowStartPicker(false)
                  if (date) setStartsAt(date)
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endsAt || new Date()}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_: any, date?: Date) => {
                  setShowEndPicker(false)
                  if (date) setEndsAt(date)
                }}
              />
            )}
            {showConvPicker && (
              <View style={{ maxHeight: 200, marginBottom: 12 }}>
                <FlatList
                  data={convs}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 }}
                      onPress={() => {
                        setConvId(item.id)
                        setShowConvPicker(false)
                      }}
                    >
                      <Text style={{ color: item.id === convId ? c.accent : c.text, fontSize: 14, flex: 1 }}>
                        {item.name || item.type}
                      </Text>
                      {item.id === convId && <Text style={{ color: c.accent }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            <View style={st.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.confirmBtn, { backgroundColor: c.accent }, creating && { opacity: 0.6 }]}
                onPress={create}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={st.confirmText}>Create Event</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const st = StyleSheet.create({
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
  createBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  createBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 13 },
  eventItem: { padding: 16, borderBottomWidth: 1 },
  eventTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitle: { fontSize: 16, fontWeight: "600", flex: 1 },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventDate: { fontSize: 12 },
  eventDuration: { fontSize: 12 },
  eventDesc: { fontSize: 13, marginTop: 6 },
  rsvpCounts: { flexDirection: "row", gap: 12, marginTop: 8 },
  rsvpRow: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  rsvpBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  rsvpBtnText: { fontSize: 13 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { width: "100%", maxWidth: 400, borderRadius: 24, padding: 24, borderWidth: 1, maxHeight: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  modalTextArea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8, alignItems: "center" },
  confirmBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, minWidth: 80, alignItems: "center" },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
