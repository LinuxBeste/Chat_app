import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from "react-native"
import { api, uploadFile } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import * as Clipboard from "expo-clipboard"
import { wsClient } from "../lib/ws"
import { useTheme } from "../lib/theme-context"

const STATUS_OPTIONS = [
  { key: "online", label: "Online", color: "#22C55E" },
  { key: "away", label: "Away", color: "#EAB308" },
  { key: "busy", label: "Busy", color: "#EF4444" },
  { key: "offline", label: "Offline", color: "#8888A0" },
]

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c } = useTheme()

  const { user, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [customStatus, setCustomStatus] = useState(user?.customStatus || "")
  const [status, setStatus] = useState(user?.status || "online")

  useEffect(() => {
    api("/api/users/me")
      .then((u: any) => {
        setDisplayName(u.displayName || "")
        setBio(u.bio || "")
        setStatus(u.status || "online")
        setCustomStatus(u.customStatus || "")
      })
      .catch(() => {})
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          status,
          customStatus: customStatus.trim() || undefined,
        }),
      })
      wsClient.send("presence:status", { status })
      Alert.alert(t("common.success"), t("profile.save"))
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message)
    } finally {
      setSaving(false)
    }
  }

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: false })
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        await uploadFile({
          uri: file.uri,
          name: "avatar.jpg",
          type: file.mimeType || "image/jpeg",
          path: "/api/users/avatar",
          fieldName: "avatar",
        })
      }
    } catch {}
  }

  return (
    <ScrollView style={[s.container, { backgroundColor: c.bg }]} contentContainerStyle={s.content}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={[s.back, { color: c.accent }]}>
            {"<"} {t("common.back")}
          </Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: c.text }]}>{t("profile.title")}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.avatarSection}>
        <TouchableOpacity
          onPress={pickAvatar}
          style={[s.avatar, { backgroundColor: c.surfaceAlt, borderColor: c.accent }]}
        >
          <Text style={[s.avatarText, { color: c.text }]}>
            {(user?.displayName || user?.username || "U")[0].toUpperCase()}
          </Text>
        </TouchableOpacity>
        <Text style={[s.username, { color: c.text }]}>@{user?.username}</Text>
        <Text style={[s.email, { color: c.textMuted }]}>{user?.email}</Text>
      </View>

      <View style={s.form}>
        <Text style={[s.label, { color: c.textSecondary }]}>{t("profile.displayName")}</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display Name"
          placeholderTextColor={c.textMuted}
        />

        <Text style={[s.label, { color: c.textSecondary }]}>{t("profile.bio")}</Text>
        <TextInput
          style={[s.input, s.bioInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          value={bio}
          onChangeText={setBio}
          placeholder="About yourself..."
          placeholderTextColor={c.textMuted}
          multiline
          numberOfLines={3}
        />

        <Text style={[s.label, { color: c.textSecondary }]}>Status</Text>
        <View style={s.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                s.statusChip,
                { backgroundColor: c.surfaceAlt, borderColor: c.border },
                status === opt.key && { backgroundColor: opt.color },
              ]}
              onPress={() => setStatus(opt.key)}
            >
              <Text style={[s.statusChipText, { color: c.textSecondary }, status === opt.key && { color: "#FFFFFF" }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.label, { color: c.textSecondary }]}>Custom Status</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          value={customStatus}
          onChangeText={setCustomStatus}
          placeholder="What's on your mind?"
          placeholderTextColor={c.textMuted}
          maxLength={80}
        />

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent }]} onPress={saveProfile} disabled={saving}>
          <Text style={s.saveText}>{saving ? t("common.loading") : t("profile.save")}</Text>
        </TouchableOpacity>

        <View style={s.idSection}>
          <Text style={[s.label, { color: c.textSecondary }]}>User ID</Text>
          <TouchableOpacity
            style={[s.idRow, { backgroundColor: c.inputBg, borderColor: c.border }]}
            onPress={() => {
              Clipboard.setStringAsync(user?.id || "")
              Alert.alert("Copied!")
            }}
          >
            <Text style={[s.idText, { color: c.textSecondary }]}>{user?.id}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={[s.logoutText, { color: c.danger }]}>{t("nav.logout")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: "500" },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "600" },
  avatarSection: { alignItems: "center", paddingVertical: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700" },
  username: { fontSize: 20, fontWeight: "600" },
  email: { fontSize: 14, marginTop: 4 },
  form: { paddingHorizontal: 24 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 16, fontWeight: "500" },
  input: {
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: {
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  idSection: { marginTop: 24 },
  idRow: { borderRadius: 12, padding: 14, borderWidth: 1 },
  idText: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  logoutBtn: { marginTop: 20, alignItems: "center", padding: 12 },
  logoutText: { fontSize: 15, fontWeight: "500" },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 13, fontWeight: "500" },
})
