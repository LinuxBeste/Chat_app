import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import { Check, Trash2 } from "lucide-react-native";
import { useTheme } from "../lib/theme-context";

interface ThemeEditorProps {
  visible: boolean;
  onClose: () => void;
}

interface ThemeData {
  id: string;
  name: string;
  theme: string;
  createdAt?: string;
}

export function ThemeEditor({ visible, onClose }: ThemeEditorProps) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
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
  });

  useEffect(() => {
    if (visible) {
      api<ThemeData[]>("/api/themes")
        .then(setThemes)
        .catch(() => {});
    }
  }, [visible]);

  const colorKeys = Object.keys(colors) as (keyof typeof colors)[];

  const saveTheme = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api("/api/themes", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), theme: JSON.stringify(colors) }),
      });
      setName("");
      api<ThemeData[]>("/api/themes")
        .then(setThemes)
        .catch(() => {});
    } catch {}
    setSaving(false);
  };

  const activateTheme = async (id: string) => {
    try {
      await api(`/api/themes/${id}/activate`, { method: "POST" });
    } catch {}
  };

  const deleteTheme = async (id: string) => {
    try {
      await api(`/api/themes/${id}`, { method: "DELETE" });
      setThemes((p) => p.filter((t) => t.id !== id));
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.editor, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
          <View style={s.header}>
            <Text style={[s.title, { color: c.text }]}>Theme Editor</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[s.close, { color: c.accent }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {themes.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: c.textSecondary }]}>Saved Themes</Text>
                {themes.map((th) => (
                  <View key={th.id} style={[s.themeRow, { borderBottomColor: c.borderLight }]}>
                    <Text style={[s.themeName, { color: c.text }]}>{th.name}</Text>
                    <TouchableOpacity style={s.activateBtn} onPress={() => activateTheme(th.id)}>
                      <Check size={14} color={c.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTheme(th.id)}>
                      <Trash2 size={14} color={c.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            <Text style={[s.sectionTitle, { color: c.textSecondary }]}>Create Theme</Text>
            <TextInput
              style={[s.nameInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder="Theme name"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={64}
            />
            {colorKeys.map((key) => (
              <View key={key} style={s.row}>
                <Text style={[s.label, { color: c.textSecondary }]}>{key}</Text>
                <View style={s.colorRow}>
                  <View style={[s.swatch, { backgroundColor: colors[key], borderColor: c.border }]} />
                  <TextInput
                    style={[s.colorInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                    value={colors[key]}
                    onChangeText={(v) => setColors((p) => ({ ...p, [key]: v }))}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: c.accent }]}
              onPress={saveTheme}
              disabled={saving || !name.trim()}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveText}>Save Theme</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editor: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "600" },
  close: { fontSize: 15, fontWeight: "500" },
  sectionTitle: {
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
  },
  themeName: { fontSize: 14, flex: 1 },
  activateBtn: { padding: 4 },
  nameInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  row: { marginBottom: 12 },
  label: { fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 8, borderWidth: 1 },
  colorInput: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  saveBtn: { borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
