import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from "react-native"
import { wsClient } from "../lib/ws"
import { api } from "../lib/api"
import { useTranslation } from "react-i18next"
import { useTheme } from "../lib/theme-context"

const statuses = [
  { key: "online", emoji: "🟢", label: "status.online" },
  { key: "away", emoji: "🟡", label: "status.away" },
  { key: "busy", emoji: "🔴", label: "status.busy" },
  { key: "offline", emoji: "⚫", label: "status.offline" },
]

export function StatusSelector() {
  const { t } = useTranslation()
  const { c } = useTheme()
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
        <Text style={[styles.triggerText, { color: c.textSecondary }]}>
          {statuses.find((st) => st.key === current)?.emoji}{" "}
          {t(statuses.find((st) => st.key === current)?.label || "status.online")}
        </Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[styles.menu, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
            {statuses.map((st) => (
              <TouchableOpacity
                key={st.key}
                style={[
                  styles.menuItem,
                  current === st.key && [styles.menuItemActive, { backgroundColor: c.accentLight }],
                ]}
                onPress={() => setStatus(st.key)}
              >
                <Text style={[styles.menuItemText, { color: c.text }]}>
                  {st.emoji} {t(st.label)}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.customInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder={t("status.setCustom")}
              placeholderTextColor={c.textMuted}
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
  triggerText: { fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  menu: {
    borderRadius: 20,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  menuItemActive: {},
  menuItemText: { fontSize: 15 },
  customInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginTop: 8,
    borderWidth: 1,
  },
})
