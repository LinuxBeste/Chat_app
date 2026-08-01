import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native"
import { MessageSquare, Eye, EyeOff, Globe, Server, Sun, Moon } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../lib/auth-context"
import { useTheme } from "../lib/theme-context"
import { defaultServerUrl, getServerUrl, resetServerUrl, setServerUrl } from "../lib/server-config"
import { useTranslation } from "react-i18next"
import { supportedLanguages } from "../lib/i18n/index"

export function LoginScreen() {
  const { t, i18n } = useTranslation()
  const { login, register } = useAuth()
  const { mode: theme, toggle: toggleTheme, c } = useTheme()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [credential, setCredential] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showServerPopup, setShowServerPopup] = useState(false)
  const [serverUrlInput, setServerUrlInput] = useState("")

  const openServerPopup = async () => {
    setServerUrlInput(await getServerUrl())
    setShowServerPopup(true)
  }

  const saveServerUrl = async () => {
    await setServerUrl(serverUrlInput)
    setShowServerPopup(false)
  }

  const resetServerUrlInput = async () => {
    await resetServerUrl()
    setServerUrlInput(await getServerUrl())
  }

  const handleSubmit = async () => {
    setError("")
    if (mode === "login") {
      if (!credential.trim()) {
        setError(t("auth.emailOrUsername") + " " + t("common.required"))
        return
      }
    } else {
      if (!username.trim()) {
        setError(t("auth.username") + " " + t("common.required"))
        return
      }
      if (!credential.trim()) {
        setError(t("auth.email") + " " + t("common.required"))
        return
      }
    }
    if (!password.trim()) {
      setError(t("auth.password") + " " + t("common.required"))
      return
    }

    setLoading(true)
    try {
      if (mode === "login") await login(credential, password)
      else await register(username, credential, password)
    } catch (e: any) {
      const msg = e?.message
      if (msg?.includes("Failed to fetch") || msg?.includes("Network")) {
        setError(t("auth.networkError"))
      } else if (msg?.includes("401")) {
        setError(t("auth.invalidCredentials"))
      } else {
        setError(msg || t("auth.somethingWentWrong"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[st.container, { backgroundColor: c.bg, paddingTop: insets.top }]}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <View style={[st.topActions, { top: insets.top + 20 }]}>
          <TouchableOpacity
            style={[st.iconBtn, { borderColor: c.border }]}
            onPress={openServerPopup}
            aria-label="Server URL"
          >
            <Server size={16} color={c.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.iconBtn, { borderColor: c.border }]}
            onPress={toggleTheme}
            aria-label={theme === "dark" ? t("settings.light") : t("settings.dark")}
          >
            {theme === "dark" ? <Sun size={16} color={c.textSecondary} /> : <Moon size={16} color={c.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.iconBtn, { borderColor: c.border }]}
            onPress={() => setShowLangPicker(true)}
            aria-label={t("settings.language")}
          >
            <Globe size={16} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={st.brand}>
          <View style={st.brandIconWrap}>
            <MessageSquare size={48} color="#6C8CFF" />
          </View>
          <Text style={[st.brandName, { color: c.text }]}>{t("app.name")}</Text>
        </View>
        <View style={[st.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[st.title, { color: c.text }]}>
            {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
          </Text>
          <Text style={[st.sub, { color: c.textSecondary }]}>
            {mode === "login" ? t("auth.signInToContinue") : t("auth.registerToStart")}
          </Text>

          {mode === "register" && (
            <TextInput
              style={[st.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
              placeholder={t("auth.username")}
              placeholderTextColor={c.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <TextInput
            style={[st.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
            placeholder={mode === "login" ? t("auth.emailOrUsername") : t("auth.email")}
            placeholderTextColor={c.textMuted}
            value={credential}
            onChangeText={setCredential}
            autoCapitalize="none"
            keyboardType={mode === "login" ? "default" : "email-address"}
            autoCorrect={false}
          />
          <View style={st.pwRow}>
            <TextInput
              style={[st.input, st.pwInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
              placeholder={t("auth.password")}
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={st.pwToggle}
              onPress={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPassword ? <EyeOff size={20} color={c.textMuted} /> : <Eye size={20} color={c.textMuted} />}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={st.errorBox}>
              <Text style={st.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[st.button, loading && st.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={st.buttonText}>{mode === "login" ? t("auth.signIn") : t("auth.create")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(mode === "login" ? "register" : "login")
              setError("")
            }}
            style={st.switchBtn}
            disabled={loading}
          >
            <Text style={[st.switch, { color: c.textSecondary }]}>
              {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
              <Text style={st.switchAccent}>{mode === "login" ? t("auth.register") : t("auth.login")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={showLangPicker} transparent animationType="fade" onRequestClose={() => setShowLangPicker(false)}>
        <TouchableOpacity
          style={[st.langOverlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setShowLangPicker(false)}
        >
          <View style={[st.langSheet, { backgroundColor: c.sheetBg, borderTopColor: c.border }]}>
            <Text style={[st.langSheetTitle, { color: c.text }]}>{t("settings.language")}</Text>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[st.langItem, { borderBottomColor: c.border }, i18n.language === lang.code && st.langItemActive]}
                onPress={() => {
                  i18n.changeLanguage(lang.code)
                  setShowLangPicker(false)
                }}
              >
                <Text style={[st.langNative, { color: c.text }, i18n.language === lang.code && st.langNativeActive]}>
                  {lang.native}
                </Text>
                <Text style={[st.langName, { color: c.textMuted }]}>{lang.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showServerPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerPopup(false)}
      >
        <View style={[st.serverOverlay, { backgroundColor: c.overlay }]}>
          <View style={[st.serverCard, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
            <Text style={[st.serverTitle, { color: c.text }]}>Server URL</Text>
            <TextInput
              style={[st.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
              placeholder={defaultServerUrl()}
              placeholderTextColor={c.textMuted}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={[st.serverHint, { color: c.textMuted }]}>
              IP or hostname of your server, e.g. 192.168.1.5:3000. Used for API and websocket connections.
            </Text>
            <View style={st.serverRow}>
              <TouchableOpacity
                style={[st.serverBtnSecondary, { borderColor: c.border }]}
                onPress={resetServerUrlInput}
              >
                <Text style={{ color: c.textSecondary }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.serverBtn} onPress={saveServerUrl}>
                <Text style={st.serverBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  topActions: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    margin: 0,
  },
  langOverlay: { flex: 1, justifyContent: "flex-end" },
  langSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  langSheetTitle: { fontSize: 18, fontWeight: "600", paddingVertical: 16, textAlign: "center" },
  langItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  langItemActive: { backgroundColor: "rgba(108,140,255,0.08)", marginHorizontal: -20, paddingHorizontal: 20 },
  langNative: { fontSize: 16 },
  langNativeActive: { color: "#6C8CFF", fontWeight: "600" },
  langName: { fontSize: 13 },
  brand: { alignItems: "center", marginBottom: 32 },
  brandIconWrap: { marginBottom: 8 },
  brandName: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  card: { width: "100%", maxWidth: 400, borderRadius: 28, borderWidth: 1, padding: 28 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 24 },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 12,
  },
  pwRow: { width: "100%", position: "relative", marginBottom: 12 },
  pwInput: { marginBottom: 0, paddingRight: 44 },
  pwToggle: { position: "absolute", right: 12, top: 13 },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: { color: "#EF4444", fontSize: 13, textAlign: "center" },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#6C8CFF",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  switchBtn: { marginTop: 20, padding: 8 },
  switch: { fontSize: 13, textAlign: "center" },
  switchAccent: { color: "#6C8CFF", fontWeight: "600" },
  serverOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  serverCard: { width: "100%", maxWidth: 400, borderRadius: 24, borderWidth: 1, padding: 20 },
  serverTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12, textAlign: "center" },
  serverHint: { fontSize: 12, marginTop: 4, marginBottom: 16, textAlign: "center" },
  serverRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  serverBtnSecondary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  serverBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#6C8CFF" },
  serverBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
})
