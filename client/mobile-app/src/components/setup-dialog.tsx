import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from "react-native"
import { useAuth } from "../lib/auth-context"
import { api } from "../lib/api"
import { useTheme } from "../lib/theme-context"
import { useTranslation } from "react-i18next"
import { Check, Sun, Moon, ChevronRight } from "lucide-react-native"

const languages = [
  { code: "en", native: "English" },
  { code: "de", native: "Deutsch" },
  { code: "fr", native: "Français" },
  { code: "es", native: "Español" },
  { code: "ja", native: "日本語" },
]

export function SetupDialog() {
  const { t, i18n } = useTranslation()
  const { completeSetup } = useAuth()
  const { mode: theme, toggle: toggleTheme } = useTheme()
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (displayName.trim()) {
      setSaving(true)
      try {
        await api("/api/users/me", { method: "PUT", body: JSON.stringify({ displayName: displayName.trim() }) })
      } catch {}
      setSaving(false)
    }
    completeSetup()
  }

  const skip = () => completeSetup()

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.progress}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.dot, i <= step && s.dotActive]} />
            ))}
          </View>
          <Text style={s.counter}>{step + 1} / 4</Text>

          {step === 0 && (
            <>
              <Text style={s.title}>Welcome!</Text>
              <Text style={s.desc}>Set up your profile to get started</Text>
              <Text style={s.emoji}>👋</Text>
              <Text style={s.body}>Let's personalize your experience.</Text>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={s.title}>Choose Language</Text>
              <Text style={s.desc}>Pick your preferred language</Text>
              <View style={s.langGrid}>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[s.langBtn, i18n.language === lang.code && s.langBtnActive]}
                    onPress={() => i18n.changeLanguage(lang.code)}
                  >
                    <Text style={[s.langText, i18n.language === lang.code && s.langTextActive]}>{lang.native}</Text>
                    {i18n.language === lang.code && <Check size={16} color="#6C8CFF" />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.title}>Choose Theme</Text>
              <Text style={s.desc}>Pick light or dark mode</Text>
              <View style={s.themeRow}>
                <TouchableOpacity
                  style={[s.themeBtn, theme === "light" && s.themeBtnActive]}
                  onPress={() => {
                    if (theme !== "light") toggleTheme()
                  }}
                >
                  <Sun size={32} color={theme === "light" ? "#6C8CFF" : "#E8E8F0"} />
                  <Text style={[s.themeLabel, theme === "light" && s.themeLabelActive]}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.themeBtn, theme === "dark" && s.themeBtnActive]}
                  onPress={() => {
                    if (theme !== "dark") toggleTheme()
                  }}
                >
                  <Moon size={32} color={theme === "dark" ? "#6C8CFF" : "#E8E8F0"} />
                  <Text style={[s.themeLabel, theme === "dark" && s.themeLabelActive]}>Dark</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.title}>Display Name</Text>
              <Text style={s.desc}>Choose how others see you</Text>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{displayName[0]?.toUpperCase() || "?"}</Text>
              </View>
              <TextInput
                style={s.input}
                placeholder="Your display name"
                placeholderTextColor="#585870"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
              />
            </>
          )}

          <View style={s.actions}>
            <TouchableOpacity onPress={skip}>
              <Text style={s.skip}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
              <Text style={s.nextText}>{step < 3 ? "Next" : saving ? "Saving..." : "Finish"}</Text>
              {step < 3 && <ChevronRight size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#101016",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#252538",
    padding: 28,
  },
  progress: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#252538" },
  dotActive: { backgroundColor: "#6C8CFF" },
  counter: { color: "#585870", fontSize: 12, textAlign: "center", marginBottom: 20 },
  title: { color: "#E8E8F0", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  desc: { color: "#8888A0", fontSize: 14, textAlign: "center", marginBottom: 20 },
  emoji: { fontSize: 64, textAlign: "center", marginBottom: 12 },
  body: { color: "#8888A0", fontSize: 14, textAlign: "center", marginBottom: 8 },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 12 },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#181825",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#252538",
  },
  langBtnActive: { borderColor: "#6C8CFF", backgroundColor: "rgba(108,140,255,0.1)" },
  langText: { color: "#E8E8F0", fontSize: 15 },
  langTextActive: { color: "#6C8CFF", fontWeight: "600" },
  themeRow: { flexDirection: "row", gap: 16, justifyContent: "center", marginBottom: 12 },
  themeBtn: {
    width: 100,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#252538",
  },
  themeBtnActive: { borderColor: "#6C8CFF", backgroundColor: "rgba(108,140,255,0.1)" },
  themeLabel: { color: "#8888A0", fontSize: 12, marginTop: 6 },
  themeLabelActive: { color: "#6C8CFF", fontWeight: "600" },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#252538",
  },
  avatarText: { color: "#E8E8F0", fontSize: 28, fontWeight: "600" },
  input: {
    backgroundColor: "#0A0A0F",
    borderRadius: 14,
    padding: 16,
    color: "#E8E8F0",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#252538",
    marginBottom: 8,
  },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
  skip: { color: "#585870", fontSize: 15 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#6C8CFF",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
