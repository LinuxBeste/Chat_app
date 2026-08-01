import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from "react-native"
import { api, apiFormData } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import * as Clipboard from "expo-clipboard"
import { wsClient } from "../lib/ws"

const STATUS_OPTIONS = [
  { key: "online", label: "Online", color: "#22C55E" },
  { key: "away", label: "Away", color: "#EAB308" },
  { key: "busy", label: "Busy", color: "#EF4444" },
  { key: "offline", label: "Offline", color: "#8888A0" },
]

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

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
        const formData = new FormData()
        formData.append("avatar", { uri: file.uri, name: "avatar.jpg", type: file.mimeType } as any)
        await apiFormData("/api/users/avatar", formData)
      }
    } catch {}
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.back}>
            {"<"} {t("common.back")}
          </Text>
        </TouchableOpacity>
        <Text style={s.title}>{t("profile.title")}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.avatarSection}>
        <TouchableOpacity onPress={pickAvatar} style={s.avatar}>
          <Text style={s.avatarText}>{(user?.displayName || user?.username || "U")[0].toUpperCase()}</Text>
        </TouchableOpacity>
        <Text style={s.username}>@{user?.username}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>{t("profile.displayName")}</Text>
        <TextInput
          style={s.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display Name"
          placeholderTextColor="#585870"
        />

        <Text style={s.label}>{t("profile.bio")}</Text>
        <TextInput
          style={[s.input, s.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="About yourself..."
          placeholderTextColor="#585870"
          multiline
          numberOfLines={3}
        />

        <Text style={s.label}>Status</Text>
        <View style={s.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[s.statusChip, status === opt.key && { backgroundColor: opt.color }]}
              onPress={() => setStatus(opt.key)}
            >
              <Text style={[s.statusChipText, status === opt.key && { color: "#FFFFFF" }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Custom Status</Text>
        <TextInput
          style={s.input}
          value={customStatus}
          onChangeText={setCustomStatus}
          placeholder="What's on your mind?"
          placeholderTextColor="#585870"
          maxLength={80}
        />

        <TouchableOpacity style={s.saveBtn} onPress={saveProfile} disabled={saving}>
          <Text style={s.saveText}>{saving ? t("common.loading") : t("profile.save")}</Text>
        </TouchableOpacity>

        <View style={s.idSection}>
          <Text style={s.label}>User ID</Text>
          <TouchableOpacity
            style={s.idRow}
            onPress={() => {
              Clipboard.setStringAsync(user?.id || "")
              Alert.alert("Copied!")
            }}
          >
            <Text style={s.idText}>{user?.id}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>{t("nav.logout")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#252538",
  },
  back: { color: "#6C8CFF", fontSize: 15, fontWeight: "500" },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "600", color: "#E8E8F0" },
  avatarSection: { alignItems: "center", paddingVertical: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#6C8CFF",
    marginBottom: 12,
  },
  avatarText: { color: "#E8E8F0", fontSize: 32, fontWeight: "700" },
  username: { color: "#E8E8F0", fontSize: 20, fontWeight: "600" },
  email: { color: "#585870", fontSize: 14, marginTop: 4 },
  form: { paddingHorizontal: 24 },
  label: { color: "#8888A0", fontSize: 13, marginBottom: 8, marginTop: 16, fontWeight: "500" },
  input: {
    backgroundColor: "#101016",
    borderRadius: 14,
    padding: 14,
    color: "#E8E8F0",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#252538",
  },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#6C8CFF",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  idSection: { marginTop: 24 },
  idRow: { backgroundColor: "#101016", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#252538" },
  idText: { color: "#8888A0", fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  logoutBtn: { marginTop: 20, alignItems: "center", padding: 12 },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "500" },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#181825",
    borderWidth: 1,
    borderColor: "#252538",
  },
  statusChipText: { color: "#8888A0", fontSize: 13, fontWeight: "500" },
})
