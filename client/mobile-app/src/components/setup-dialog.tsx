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
  const { mode: theme, toggle: toggleTheme, c } = useTheme()
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
        <View style={[s.card, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
          <View style={s.progress}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  { backgroundColor: c.border },
                  i <= step && [s.dotActive, { backgroundColor: c.accent }],
                ]}
              />
            ))}
          </View>
          <Text style={[s.counter, { color: c.textMuted }]}>{step + 1} / 4</Text>

          {step === 0 && (
            <>
              <Text style={[s.title, { color: c.text }]}>Welcome!</Text>
              <Text style={[s.desc, { color: c.textSecondary }]}>Set up your profile to get started</Text>
              <Text style={s.emoji}>👋</Text>
              <Text style={[s.body, { color: c.textSecondary }]}>Let's personalize your experience.</Text>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={[s.title, { color: c.text }]}>Choose Language</Text>
              <Text style={[s.desc, { color: c.textSecondary }]}>Pick your preferred language</Text>
              <View style={s.langGrid}>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      s.langBtn,
                      { backgroundColor: c.surfaceAlt, borderColor: c.border },
                      i18n.language === lang.code && [
                        s.langBtnActive,
                        { borderColor: c.accent, backgroundColor: c.accentLight },
                      ],
                    ]}
                    onPress={() => i18n.changeLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        s.langText,
                        { color: c.text },
                        i18n.language === lang.code && [s.langTextActive, { color: c.accent }],
                      ]}
                    >
                      {lang.native}
                    </Text>
                    {i18n.language === lang.code && <Check size={16} color={c.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={[s.title, { color: c.text }]}>Choose Theme</Text>
              <Text style={[s.desc, { color: c.textSecondary }]}>Pick light or dark mode</Text>
              <View style={s.themeRow}>
                <TouchableOpacity
                  style={[
                    s.themeBtn,
                    { backgroundColor: c.surfaceAlt, borderColor: c.border },
                    theme === "light" && [s.themeBtnActive, { borderColor: c.accent, backgroundColor: c.accentLight }],
                  ]}
                  onPress={() => {
                    if (theme !== "light") toggleTheme()
                  }}
                >
                  <Sun size={32} color={theme === "light" ? c.accent : c.text} />
                  <Text
                    style={[
                      s.themeLabel,
                      { color: c.textSecondary },
                      theme === "light" && [s.themeLabelActive, { color: c.accent }],
                    ]}
                  >
                    Light
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.themeBtn,
                    { backgroundColor: c.surfaceAlt, borderColor: c.border },
                    theme === "dark" && [s.themeBtnActive, { borderColor: c.accent, backgroundColor: c.accentLight }],
                  ]}
                  onPress={() => {
                    if (theme !== "dark") toggleTheme()
                  }}
                >
                  <Moon size={32} color={theme === "dark" ? c.accent : c.text} />
                  <Text
                    style={[
                      s.themeLabel,
                      { color: c.textSecondary },
                      theme === "dark" && [s.themeLabelActive, { color: c.accent }],
                    ]}
                  >
                    Dark
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={[s.title, { color: c.text }]}>Display Name</Text>
              <Text style={[s.desc, { color: c.textSecondary }]}>Choose how others see you</Text>
              <View style={[s.avatarCircle, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Text style={[s.avatarText, { color: c.text }]}>{displayName[0]?.toUpperCase() || "?"}</Text>
              </View>
              <TextInput
                style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                placeholder="Your display name"
                placeholderTextColor={c.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
              />
            </>
          )}

          <View style={s.actions}>
            <TouchableOpacity onPress={skip}>
              <Text style={[s.skip, { color: c.textMuted }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.nextBtn, { backgroundColor: c.accent }]} onPress={handleNext}>
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
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
  },
  progress: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 },
  dot: { width: 32, height: 4, borderRadius: 2 },
  dotActive: {},
  counter: { fontSize: 12, textAlign: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  desc: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  emoji: { fontSize: 64, textAlign: "center", marginBottom: 12 },
  body: { fontSize: 14, textAlign: "center", marginBottom: 8 },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 12 },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  langBtnActive: {},
  langText: { fontSize: 15 },
  langTextActive: { fontWeight: "600" },
  themeRow: { flexDirection: "row", gap: 16, justifyContent: "center", marginBottom: 12 },
  themeBtn: {
    width: 100,
    height: 80,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  themeBtnActive: {},
  themeLabel: { fontSize: 12, marginTop: 6 },
  themeLabelActive: { fontWeight: "600" },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 2,
  },
  avatarText: { fontSize: 28, fontWeight: "600" },
  input: {
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
  skip: { fontSize: 15 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
