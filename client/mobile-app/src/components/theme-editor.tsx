import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator } from "react-native"
import { api } from "../lib/api"
import { useTranslation } from "react-i18next"
import { Check, Trash2 } from "lucide-react-native"

interface ThemeEditorProps {
  visible: boolean
  onClose: () => void
}

interface ThemeData {
  id: string
  name: string
  theme: string
  createdAt?: string
}

export function ThemeEditor({ visible, onClose }: ThemeEditorProps) {
  const { t } = useTranslation()
  const [themes, setThemes] = useState<ThemeData[]>([])
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [colors, setColors] = useState({
    "bg-primary": "#0A0A0F",
    "bg-secondary": "#101016",
    surface: "#181825",
    border: "#1A1A28",
    accent: "#6C8CFF",
    "accent-hover": "#5A7BE6",
    "text-primary": "#E8E8F0",
    "text-secondary": "#8888A0",
    "text-muted": "#585870",
  })

  useEffect(() => {
    if (visible) {
      api<ThemeData[]>("/api/themes")
        .then(setThemes)
        .catch(() => {})
    }
  }, [visible])

  const colorKeys = Object.keys(colors) as (keyof typeof colors)[]

  const saveTheme = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api("/api/themes", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), theme: JSON.stringify(colors) }),
      })
      setName("")
      api<ThemeData[]>("/api/themes")
        .then(setThemes)
        .catch(() => {})
    } catch {}
    setSaving(false)
  }

  const activateTheme = async (id: string) => {
    try {
      await api(`/api/themes/${id}/activate`, { method: "POST" })
    } catch {}
  }

  const deleteTheme = async (id: string) => {
    try {
      await api(`/api/themes/${id}`, { method: "DELETE" })
      setThemes((p) => p.filter((t) => t.id !== id))
    } catch {}
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.editor}>
          <View style={s.header}>
            <Text style={s.title}>Theme Editor</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.close}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {themes.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Saved Themes</Text>
                {themes.map((th) => (
                  <View key={th.id} style={s.themeRow}>
                    <Text style={s.themeName}>{th.name}</Text>
                    <TouchableOpacity style={s.activateBtn} onPress={() => activateTheme(th.id)}>
                      <Check size={14} color="#22C55E" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTheme(th.id)}>
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            <Text style={s.sectionTitle}>Create Theme</Text>
            <TextInput
              style={s.nameInput}
              placeholder="Theme name"
              placeholderTextColor="#585870"
              value={name}
              onChangeText={setName}
              maxLength={64}
            />
            {colorKeys.map((key) => (
              <View key={key} style={s.row}>
                <Text style={s.label}>{key}</Text>
                <View style={s.colorRow}>
                  <View style={[s.swatch, { backgroundColor: colors[key] }]} />
                  <TextInput
                    style={s.colorInput}
                    value={colors[key]}
                    onChangeText={(v) => setColors((p) => ({ ...p, [key]: v }))}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={saveTheme} disabled={saving || !name.trim()}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveText}>Save Theme</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editor: {
    backgroundColor: "#101016",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#1A1A28",
    borderBottomWidth: 0,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  close: { color: "#6C8CFF", fontSize: 15, fontWeight: "500" },
  sectionTitle: {
    color: "#8888A0",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A28",
  },
  themeName: { color: "#E8E8F0", fontSize: 14, flex: 1 },
  activateBtn: { padding: 4 },
  nameInput: {
    backgroundColor: "#0A0A0F",
    borderRadius: 10,
    padding: 12,
    color: "#E8E8F0",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#1A1A28",
    marginBottom: 16,
  },
  row: { marginBottom: 12 },
  label: { color: "#8888A0", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "#1A1A28" },
  colorInput: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    borderRadius: 10,
    padding: 10,
    color: "#E8E8F0",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  saveBtn: { backgroundColor: "#6C8CFF", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
