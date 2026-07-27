import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from "react-native"
import { wsClient } from "../lib/ws"
import { api } from "../lib/api"
import { useTranslation } from "react-i18next"

const statuses = [
  { key: "online", emoji: "🟢", label: "status.online" },
  { key: "away", emoji: "🟡", label: "status.away" },
  { key: "busy", emoji: "🔴", label: "status.busy" },
  { key: "offline", emoji: "⚫", label: "status.offline" },
]

export function StatusSelector() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState("online")
  const [customText, setCustomText] = useState("")

  useEffect(() => {
    api<{ status?: string; customStatus?: string }>("/api/users/me")
      .then((u) => {
        if (u.status) setCurrent(u.status)
        if (u.customStatus) setCustomText(u.customStatus)
      })
      .catch(() => {})
  }, [])

  const setStatus = (status: string) => {
    setCurrent(status)
    wsClient.send("presence:status", { status, customStatus: customText || undefined })
    setVisible(false)
  }

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerText}>
          {statuses.find((st) => st.key === current)?.emoji}{" "}
          {t(statuses.find((st) => st.key === current)?.label || "status.online")}
        </Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            {statuses.map((st) => (
              <TouchableOpacity
                key={st.key}
                style={[styles.menuItem, current === st.key && styles.menuItemActive]}
                onPress={() => setStatus(st.key)}
              >
                <Text style={styles.menuItemText}>
                  {st.emoji} {t(st.label)}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.customInput}
              placeholder={t("status.setCustom")}
              placeholderTextColor="#585870"
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={() => setStatus(current)}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: { padding: 4 },
  triggerText: { color: "#8888A0", fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  menu: {
    backgroundColor: "#101016",
    borderRadius: 20,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: "#252538",
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  menuItemActive: { backgroundColor: "rgba(108,140,255,0.1)" },
  menuItemText: { color: "#E8E8F0", fontSize: 15 },
  customInput: {
    backgroundColor: "#0A0A0F",
    borderRadius: 12,
    padding: 12,
    color: "#E8E8F0",
    fontSize: 13,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#252538",
  },
})
