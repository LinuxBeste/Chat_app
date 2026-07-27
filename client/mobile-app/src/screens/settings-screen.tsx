import { useState, useEffect, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  Modal,
  Platform,
  Dimensions,
} from "react-native"
import {
  User,
  Lock,
  Palette,
  Bell,
  Shield,
  MessageSquare,
  Phone,
  Camera,
  Mic,
  Accessibility,
  Globe,
  Keyboard,
  Settings as SettingsIcon,
  Info,
  ChevronLeft,
  Moon,
  Sun,
  Type,
  Square,
  Layers,
  Grid3X3,
  Hash,
  Sliders,
  Zap,
  MessageCircle,
  Sparkles,
  ChevronDown,
  Trash2,
  Send,
  Eye,
  Search,
} from "lucide-react-native"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth-context"
import { useTheme } from "../lib/theme-context"
import { useTranslation } from "react-i18next"
import { supportedLanguages } from "../lib/i18n/index"
import i18n from "../lib/i18n"

type SettingsTab =
  | "account"
  | "security"
  | "appearance"
  | "notifications"
  | "privacy"
  | "chat"
  | "calls"
  | "media"
  | "audio"
  | "accessibility"
  | "language"
  | "shortcuts"
  | "advanced"
  | "about"

interface TabItem {
  key: SettingsTab
  label: string
  icon: typeof User
}

const tabGroups: { label: string; tabs: TabItem[] }[] = [
  {
    label: "General",
    tabs: [
      { key: "account", label: "Account", icon: User },
      { key: "security", label: "Security", icon: Lock },
      { key: "appearance", label: "Appearance", icon: Palette },
      { key: "notifications", label: "Notifications", icon: Bell },
      { key: "privacy", label: "Privacy", icon: Shield },
      { key: "about", label: "About", icon: Info },
    ],
  },
  {
    label: "Communication",
    tabs: [
      { key: "chat", label: "Chat", icon: MessageSquare },
      { key: "calls", label: "Calls", icon: Phone },
      { key: "media", label: "Media", icon: Camera },
      { key: "audio", label: "Audio & Video", icon: Mic },
    ],
  },
  {
    label: "Experience",
    tabs: [
      { key: "accessibility", label: "Accessibility", icon: Accessibility },
      { key: "shortcuts", label: "Shortcuts", icon: Keyboard },
      { key: "language", label: "Language", icon: Globe },
    ],
  },
  {
    label: "System",
    tabs: [{ key: "advanced", label: "Advanced", icon: SettingsIcon }],
  },
]

const allTabs = tabGroups.flatMap((g) => g.tabs)

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { c } = useTheme()
  const [tab, setTab] = useState<SettingsTab>("account")
  const [prefs, setPrefs] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    api<Record<string, any>>("/api/users/preferences")
      .then(setPrefs)
      .catch(() => {})
  }, [])

  const updatePref = async (key: string, value: any) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    try {
      await api("/api/users/preferences", { method: "PUT", body: JSON.stringify(updated) })
    } catch {}
  }

  const filteredTabs = searchQuery
    ? allTabs.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : null

  const showingSearch = filteredTabs !== null
  const displayTabs = showingSearch ? filteredTabs : allTabs

  return (
    <View style={[st.container, { backgroundColor: c.bg }]}>
      <View style={[st.header, { backgroundColor: c.bg, borderBottomColor: c.borderLight }]}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <ChevronLeft size={24} color={c.accent} />
        </TouchableOpacity>
        <Text style={[st.title, { color: c.text }]}>Settings</Text>
        <TouchableOpacity
          onPress={() => setSearchQuery(searchQuery ? "" : " ")}
          style={[st.iconBtn, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}
        >
          <Search size={16} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      {searchQuery ? (
        <View style={[st.searchBar, { borderBottomColor: c.borderLight, backgroundColor: c.bg }]}>
          <Search size={16} color={c.textMuted} />
          <TextInput
            style={[st.searchInput, { color: c.text }]}
            placeholder="Search settings..."
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[st.catRow, { borderBottomColor: c.borderLight }]}
          contentContainerStyle={st.catContent}
        >
          {tabGroups.map((group) => {
            const hasActive = group.tabs.some((t) => t.key === tab)
            return (
              <View key={group.label} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[st.catLabel, { color: c.textMuted }]}>{group.label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 0 }}>
                  {group.tabs.map((tabItem) => {
                    const TabIcon = tabItem.icon
                    const isActive = tab === tabItem.key
                    return (
                      <TouchableOpacity
                        key={tabItem.key}
                        style={[st.tab, { backgroundColor: isActive ? c.accent : c.surfaceAlt }]}
                        onPress={() => {
                          setTab(tabItem.key)
                          setSearchQuery("")
                        }}
                      >
                        <TabIcon size={12} color={isActive ? "#FFFFFF" : c.textSecondary} />
                        <Text style={[st.tabText, { color: isActive ? "#FFFFFF" : c.textSecondary }]}>
                          {tabItem.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )
          })}
        </ScrollView>
      )}

      {showingSearch && filteredTabs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Search size={40} color={c.textMuted} />
          <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 12 }}>No matching settings</Text>
        </View>
      ) : showingSearch ? (
        <ScrollView style={st.content} showsVerticalScrollIndicator={false}>
          {tabGroups.map((group) => {
            const matched = group.tabs.filter((t) => t.key === tab || filteredTabs.some((ft) => ft.key === t.key))
            if (matched.length === 0) return null
            return (
              <View key={group.label} style={{ marginBottom: 8 }}>
                <Text style={[st.searchCat, { color: c.textMuted }]}>{group.label}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16 }}>
                  {matched.map((tabItem) => {
                    const TabIcon = tabItem.icon
                    const isActive = tab === tabItem.key
                    return (
                      <TouchableOpacity
                        key={tabItem.key}
                        style={[
                          st.searchTab,
                          {
                            backgroundColor: isActive ? c.accent : c.surfaceAlt,
                            borderColor: isActive ? c.accent : c.border,
                          },
                        ]}
                        onPress={() => {
                          setTab(tabItem.key)
                          setSearchQuery("")
                        }}
                      >
                        <TabIcon size={14} color={isActive ? "#FFFFFF" : c.textSecondary} />
                        <Text style={[st.tabText, { color: isActive ? "#FFFFFF" : c.textSecondary }]}>
                          {tabItem.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )
          })}
        </ScrollView>
      ) : (
        <ScrollView style={st.content} showsVerticalScrollIndicator={false}>
          {tab === "account" && <AccountSettings user={user!} />}
          {tab === "security" && <SecuritySettings prefs={prefs} updatePref={updatePref} />}
          {tab === "appearance" && <AppearanceSettings prefs={prefs} updatePref={updatePref} />}
          {tab === "notifications" && <NotificationSettings prefs={prefs} updatePref={updatePref} />}
          {tab === "privacy" && <PrivacySettings user={user!} prefs={prefs} updatePref={updatePref} />}
          {tab === "chat" && <ChatSettings prefs={prefs} updatePref={updatePref} />}
          {tab === "calls" && <CallSettings prefs={prefs} updatePref={updatePref} />}
          {tab === "media" && <MediaSettings prefs={prefs} updatePref={updatePref} />}
          {tab === "audio" && <AudioVideoSettings />}
          {tab === "accessibility" && <AccessibilitySettings prefs={prefs} updatePref={updatePref} />}
          {tab === "language" && <LanguageSettings />}
          {tab === "shortcuts" && <ShortcutsSettings />}
          {tab === "advanced" && <AdvancedSettings />}
          {tab === "about" && <AboutSection />}
        </ScrollView>
      )}
    </View>
  )
}

/* ---------- shared helpers ---------- */

function SettingRow({
  label,
  description,
  children,
  last,
}: {
  label: string
  description?: string
  children: React.ReactNode
  last?: boolean
}) {
  const { c } = useTheme()
  return (
    <View style={[ss.row, !last && { borderBottomWidth: 1, borderBottomColor: c.borderLight }]}>
      <View style={ss.rowLeft}>
        <Text style={[ss.rowLabel, { color: c.text }]}>{label}</Text>
        {description && <Text style={[ss.rowDesc, { color: c.textMuted }]}>{description}</Text>}
      </View>
      {children}
    </View>
  )
}

function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const { c } = useTheme()
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: c.textMuted, true: c.accent }}
      thumbColor={c.text}
    />
  )
}

function SectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  const { c } = useTheme()
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 28,
        marginBottom: 12,
        paddingHorizontal: 16,
      }}
    >
      <Icon size={14} color={c.accent} />
      <Text style={[ss.sectionTitle, { color: c.textMuted }]}>{label}</Text>
    </View>
  )
}

function Select({
  value,
  options,
  onChange,
  label,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  label?: string
}) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <TouchableOpacity
        style={[ss.selectBtn, { borderColor: c.border, backgroundColor: c.inputBg }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={{ color: c.textSecondary, fontSize: 13, maxWidth: 100 }} numberOfLines={1}>
          {current?.label || value}
        </Text>
        <ChevronDown size={12} color={c.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[ss.selectSheet, { backgroundColor: c.sheetBg, borderTopColor: c.border }]}>
            <View style={[ss.selectHandle, { backgroundColor: c.textMuted }]} />
            <Text style={[ss.selectSheetTitle, { color: c.text }]}>{label || "Select"}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[ss.selectItem, isSelected && { backgroundColor: c.accentLight }]}
                    onPress={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    <Text
                      style={[
                        ss.selectItemText,
                        { color: isSelected ? c.accent : c.text },
                        isSelected && { fontWeight: "600" },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Text style={{ color: c.accent, fontSize: 14 }}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

function ColorSwatchPicker({
  value,
  onChange,
  colors,
}: {
  value: string
  onChange: (c: string) => void
  colors: string[]
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {colors.map((color) => (
        <TouchableOpacity
          key={color}
          onPress={() => onChange(color)}
          activeOpacity={0.7}
          style={[ss.swatch, { backgroundColor: color }, value === color && ss.swatchActive]}
        />
      ))}
    </View>
  )
}

function SliderControl({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  const { c } = useTheme()
  const s = step || 1
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(String(value))
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - s))}
        style={[ss.sliderBtn, { borderColor: c.border, backgroundColor: c.inputBg }]}
      >
        <Text style={{ color: c.textSecondary, fontSize: 14 }}>−</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          setInput(String(value))
          setEditing(true)
        }}
        style={[ss.sliderValue, { backgroundColor: c.inputBg }]}
      >
        <Text style={{ color: c.text, fontSize: 13, textAlign: "center" }}>{value}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + s))}
        style={[ss.sliderBtn, { borderColor: c.border, backgroundColor: c.inputBg }]}
      >
        <Text style={{ color: c.textSecondary, fontSize: 14 }}>+</Text>
      </TouchableOpacity>
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "center", alignItems: "center" }}
          activeOpacity={1}
          onPress={() => setEditing(false)}
        >
          <View style={[ss.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[ss.modalTitle, { color: c.text }]}>
              Enter value ({min}–{max})
            </Text>
            <TextInput
              style={[ss.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              autoFocus
            />
            <View style={ss.modalActions}>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.btnSm, { backgroundColor: c.accent }]}
                onPress={() => {
                  const v = parseInt(input)
                  if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
                  setEditing(false)
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <View style={[ss.sectionCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.borderLight,
        }}
      >
        <Icon size={14} color={c.accent} />
        <Text style={{ color: c.text, fontSize: 14, fontWeight: "600" }}>{title}</Text>
      </View>
      <View style={{ paddingHorizontal: 16 }}>{children}</View>
    </View>
  )
}

/* ---------- ACCOUNT ---------- */

function AccountSettings({ user }: { user: any }) {
  const { c } = useTheme()
  const [verifyMsg, setVerifyMsg] = useState("")
  const [sendingVerification, setSendingVerification] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    api<any[]>("/api/auth/sessions")
      .then(setSessions)
      .catch(() => {})
  }, [])

  const revokeSession = (id: string) => {
    api(`/api/auth/sessions/${id}`, { method: "DELETE" })
      .then(() => setSessions((p) => p.filter((s) => s.id !== id)))
      .catch(() => {})
  }

  const deleteAccount = () => {
    Alert.alert("Delete Account", "This will permanently delete your account and all data. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/users/me", { method: "DELETE" })
            Alert.alert("Account deleted")
          } catch {
            Alert.alert("Failed to delete account")
          }
        },
      },
    ])
  }

  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Profile Info" icon={User}>
        <SettingRow label="Username">
          <Text style={[ss.value, { color: c.textMuted }]}>@{user?.username}</Text>
        </SettingRow>
        <SettingRow label="Display Name">
          <Text style={[ss.value, { color: c.textMuted }]}>{user?.displayName || "Not set"}</Text>
        </SettingRow>
        <SettingRow label="Email">
          <Text style={[ss.value, { color: c.textMuted }]}>{user?.email}</Text>
        </SettingRow>
        <SettingRow label="Member Since" last>
          <Text style={[ss.value, { color: c.textMuted }]}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
          </Text>
        </SettingRow>
      </Section>

      <Section title="Email Verification" icon={MessageSquare}>
        {user?.emailVerified !== "true" ? (
          <>
            <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 12, marginTop: 4 }}>
              Your email is not verified.
            </Text>
            <TouchableOpacity
              style={[ss.btnInline, { backgroundColor: c.accent }]}
              onPress={async () => {
                setSendingVerification(true)
                try {
                  await api("/api/auth/send-verification", { method: "POST" })
                  setVerifyMsg("Verification email sent")
                } catch {
                  setVerifyMsg("Failed to send verification")
                }
                setSendingVerification(false)
              }}
              disabled={sendingVerification}
            >
              <Text style={ss.btnInlineText}>{sendingVerification ? "Sending..." : "Verify Email"}</Text>
            </TouchableOpacity>
            {verifyMsg ? <Text style={{ color: c.success, fontSize: 13, marginTop: 8 }}>{verifyMsg}</Text> : null}
          </>
        ) : (
          <Text style={{ color: c.success, fontSize: 13, marginTop: 4 }}>Email verified ✓</Text>
        )}
      </Section>

      <Section title="Active Sessions" icon={Shield}>
        {sessions.length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>No active sessions</Text>
        ) : (
          sessions.slice(0, 10).map((s, i) => (
            <SettingRow
              key={s.id}
              label={s.userAgent || "Unknown device"}
              last={i === Math.min(sessions.length, 10) - 1}
            >
              <TouchableOpacity
                onPress={() => revokeSession(s.id)}
                style={[ss.smallDangerBtn, { backgroundColor: "rgba(239,68,68,0.12)" }]}
              >
                <Text style={{ color: c.danger, fontSize: 12, fontWeight: "500" }}>Revoke</Text>
              </TouchableOpacity>
            </SettingRow>
          ))
        )}
      </Section>

      <Section title="Danger Zone" icon={Trash2}>
        <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 12, marginTop: 4 }}>
          Permanently delete your account and all data.
        </Text>
        <TouchableOpacity style={[ss.btnInline, { backgroundColor: c.danger }]} onPress={deleteAccount}>
          <Text style={ss.btnInlineText}>Delete Account</Text>
        </TouchableOpacity>
      </Section>
    </View>
  )
}

/* ---------- SECURITY ---------- */

function SecuritySettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  const { c } = useTheme()
  const [totpStatus, setTotpStatus] = useState<any>(null)
  const [totpModal, setTotpModal] = useState(false)
  const [totpCode, setTotpCode] = useState("")
  const [sessions, setSessions] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    api("/api/security/totp/status")
      .then(setTotpStatus)
      .catch(() => {})
    api<any[]>("/api/auth/sessions")
      .then(setSessions)
      .catch(() => {})
    api<any[]>("/api/security/history")
      .then(setHistory)
      .catch(() => {})
  }, [])

  const setupTotp = async () => {
    try {
      const data = await api<{ secret: string }>("/api/security/totp/setup", { method: "POST" })
      Alert.alert("TOTP Setup", `Secret: ${data.secret}\nAdd this to your authenticator app, then verify with a code.`)
      setTotpModal(true)
    } catch {}
  }

  const verifyTotp = async () => {
    try {
      await api("/api/security/totp/verify", { method: "POST", body: JSON.stringify({ code: totpCode }) })
      setTotpModal(false)
      setTotpCode("")
      api("/api/security/totp/status")
        .then(setTotpStatus)
        .catch(() => {})
    } catch {}
  }

  const disableTotp = async () => {
    try {
      await api("/api/security/totp/disable", { method: "POST" })
      api("/api/security/totp/status")
        .then(setTotpStatus)
        .catch(() => {})
    } catch {}
  }

  const revokeSession = (id: string) => {
    api(`/api/auth/sessions/${id}`, { method: "DELETE" })
      .then(() => setSessions((p) => p.filter((s) => s.id !== id)))
      .catch(() => {})
  }

  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Two-Factor Authentication" icon={Shield}>
        <SettingRow label="TOTP Status">
          <Text style={[ss.value, { color: totpStatus?.enabled ? c.success : c.textMuted }]}>
            {totpStatus?.enabled ? "Enabled" : "Disabled"}
          </Text>
        </SettingRow>
        {!totpStatus?.enabled ? (
          <TouchableOpacity style={[ss.btnInline, { backgroundColor: c.accent }]} onPress={setupTotp}>
            <Text style={ss.btnInlineText}>Enable 2FA</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[ss.btnInline, { backgroundColor: c.danger }]} onPress={disableTotp}>
            <Text style={ss.btnInlineText}>Disable 2FA</Text>
          </TouchableOpacity>
        )}
        <Modal visible={totpModal} transparent animationType="fade" onRequestClose={() => setTotpModal(false)}>
          <View style={[ss.overlay, { backgroundColor: c.overlay }]}>
            <View style={[ss.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[ss.modalTitle, { color: c.text }]}>Verify TOTP</Text>
              <TextInput
                style={[ss.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                placeholder="6-digit code"
                placeholderTextColor={c.textMuted}
                value={totpCode}
                onChangeText={setTotpCode}
                keyboardType="number-pad"
              />
              <View style={ss.modalActions}>
                <TouchableOpacity onPress={() => setTotpModal(false)}>
                  <Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[ss.btnSm, { backgroundColor: c.accent }]} onPress={verifyTotp}>
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Section>

      <Section title="Session Controls" icon={Lock}>
        <SettingRow label="Session Timeout" description="Auto-logout after inactivity">
          <Select
            value={String(prefs.sessionTimeout || "30")}
            onChange={(v) => updatePref("sessionTimeout", v)}
            options={[
              { value: "15", label: "15 min" },
              { value: "30", label: "30 min" },
              { value: "60", label: "1 hour" },
              { value: "never", label: "Never" },
            ]}
            label="Session Timeout"
          />
        </SettingRow>
        <SettingRow label="Security Alerts" description="Alerts about suspicious login activity" last>
          <Toggle value={prefs.securityAlerts !== false} onValueChange={(v) => updatePref("securityAlerts", v)} />
        </SettingRow>
      </Section>

      <Section title="Login History" icon={MessageSquare}>
        {history.length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>No login history</Text>
        ) : (
          history.slice(0, 10).map((h, i) => (
            <SettingRow
              key={i}
              label={new Date(h.createdAt).toLocaleString()}
              last={i === Math.min(history.length, 10) - 1}
            >
              <Text style={[ss.value, { color: c.textMuted }]}>{h.ip || "Unknown"}</Text>
            </SettingRow>
          ))
        )}
      </Section>
    </View>
  )
}

/* ---------- APPEARANCE ---------- */

const ACCENT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
]
const SECONDARY_COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6", "#22c55e", "#eab308", "#f97316"]

function AppearanceSettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  const { t } = useTranslation()
  const { mode: theme, toggle: toggleTheme, c } = useTheme()
  const [themeEditorVisible, setThemeEditorVisible] = useState(false)
  const [customStatusText, setCustomStatusText] = useState("")
  const [statusEmojiLocal, setStatusEmojiLocal] = useState("")
  const [savingCustomStatus, setSavingCustomStatus] = useState(false)
  const [customStatusMsg, setCustomStatusMsg] = useState("")
  const [statusEmojiSaveMsg, setStatusEmojiSaveMsg] = useState("")

  const saveCustomStatus = async () => {
    setSavingCustomStatus(true)
    try {
      await api("/api/users/status", { method: "PUT", body: JSON.stringify({ text: customStatusText }) })
      setCustomStatusMsg("Status updated")
    } catch {
      setCustomStatusMsg("Failed")
    }
    setSavingCustomStatus(false)
    setTimeout(() => setCustomStatusMsg(""), 2000)
  }

  const clearStatusEmoji = async () => {
    setStatusEmojiLocal("")
    try {
      await api("/api/users/preferences", { method: "PUT", body: JSON.stringify({ ...prefs, statusEmoji: "" }) })
    } catch {}
    setStatusEmojiSaveMsg("Reset to colored dot")
    setTimeout(() => setStatusEmojiSaveMsg(""), 2000)
  }

  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title={t("settings.appearance.themeMode", "Theme Mode")} icon={theme === "dark" ? Moon : Sun}>
        <SettingRow
          label={t("settings.appearance.darkMode", "Dark Mode")}
          description={t("settings.appearance.darkModeDesc", "Switch between light and dark mode")}
        >
          <Toggle value={theme === "dark"} onValueChange={toggleTheme} />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.accentColor", "Accent Color")}
          description={t("settings.appearance.accentColorDesc", "Primary brand color")}
        >
          <ColorSwatchPicker
            value={prefs.accentColor || c.accent}
            onChange={(v) => updatePref("accentColor", v)}
            colors={ACCENT_COLORS}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.secondaryColor", "Secondary Color")}
          description={t("settings.appearance.secondaryColorDesc", "Secondary accent for highlights")}
        >
          <ColorSwatchPicker
            value={prefs.secondaryColor || "#8b5cf6"}
            onChange={(v) => updatePref("secondaryColor", v)}
            colors={SECONDARY_COLORS}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.glassMorphism", "Glass Morphism")}
          description={t("settings.appearance.glassMorphismDesc", "Apply glass blur effect to surfaces")}
        >
          <Toggle value={prefs.glassMorphism ?? false} onValueChange={(v) => updatePref("glassMorphism", v)} />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.backgroundPattern", "Background Pattern")}
          description={t("settings.appearance.backgroundPatternDesc", "Decorative background pattern")}
        >
          <Select
            value={prefs.backgroundPattern || "none"}
            onChange={(v) => updatePref("backgroundPattern", v)}
            options={[
              { value: "none", label: "None" },
              { value: "dots", label: "Dots" },
              { value: "grid", label: "Grid" },
              { value: "waves", label: "Waves" },
            ]}
            label="Background Pattern"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.backgroundBlur", "Background Blur")}
          description={t("settings.appearance.backgroundBlurDesc", "Blur intensity for background layers")}
        >
          <SliderControl
            value={prefs.backgroundBlur ?? 0}
            min={0}
            max={24}
            step={2}
            onChange={(v) => updatePref("backgroundBlur", v)}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.saturation", "Saturation")}
          description={t("settings.appearance.saturationDesc", "Color saturation level (%)")}
        >
          <SliderControl
            value={prefs.saturation ?? 100}
            min={0}
            max={200}
            onChange={(v) => updatePref("saturation", v)}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.contrast", "Contrast")}
          description={t("settings.appearance.contrastDesc", "UI contrast level (%)")}
        >
          <SliderControl value={prefs.contrast ?? 100} min={50} max={150} onChange={(v) => updatePref("contrast", v)} />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.brightness", "Brightness")}
          description={t("settings.appearance.brightnessDesc", "UI brightness level (%)")}
          last
        >
          <SliderControl
            value={prefs.brightness ?? 100}
            min={50}
            max={150}
            onChange={(v) => updatePref("brightness", v)}
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.typography", "Typography")} icon={Type}>
        <SettingRow
          label={t("settings.appearance.fontFamily", "Font Family")}
          description={t("settings.appearance.fontFamilyDesc", "Primary text font")}
        >
          <Select
            value={prefs.fontFamily || "system"}
            onChange={(v) => updatePref("fontFamily", v)}
            options={[
              { value: "system", label: "System" },
              { value: "sans", label: "Sans Serif" },
              { value: "serif", label: "Serif" },
              { value: "mono", label: "Monospace" },
              { value: "inter", label: "Inter" },
              { value: "roboto", label: "Roboto" },
              { value: "poppins", label: "Poppins" },
              { value: "noto", label: "Noto Sans" },
            ]}
            label="Font Family"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.monospaceFont", "Monospace Font")}
          description={t("settings.appearance.monospaceFontDesc", "Font for code blocks")}
        >
          <Select
            value={prefs.monospaceFont || "monospace"}
            onChange={(v) => updatePref("monospaceFont", v)}
            options={[
              { value: "monospace", label: "Default Mono" },
              { value: "jetbrains", label: "JetBrains Mono" },
              { value: "fira", label: "Fira Code" },
              { value: "source", label: "Source Code Pro" },
              { value: "cascadia", label: "Cascadia Code" },
            ]}
            label="Monospace Font"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.fontSize", "Font Size")}
          description={t("settings.appearance.fontSizeDesc", "Base text size")}
        >
          <Select
            value={prefs.fontSize || "medium"}
            onChange={(v) => updatePref("fontSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
              { value: "xlarge", label: "Extra Large" },
            ]}
            label="Font Size"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.codeFontSize", "Code Font Size")}
          description={t("settings.appearance.codeFontSizeDesc", "Text size in code blocks")}
          last
        >
          <Select
            value={prefs.codeFontSize || "medium"}
            onChange={(v) => updatePref("codeFontSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            label="Code Font Size"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.corners", "Corners & Radius")} icon={Square}>
        {(
          ["borderRadius", "buttonRadius", "inputRadius", "chatBubbleRadius", "modalRadius", "cardRadius"] as const
        ).map((key, idx, arr) => {
          const labels: Record<string, { label: string; desc: string }> = {
            borderRadius: { label: "Default Border Radius", desc: "Global corner rounding" },
            buttonRadius: { label: "Button Radius", desc: "Button corner rounding" },
            inputRadius: { label: "Input Radius", desc: "Input field corner rounding" },
            chatBubbleRadius: { label: "Chat Bubble Radius", desc: "Message bubble corner rounding" },
            modalRadius: { label: "Modal Radius", desc: "Dialog corner rounding" },
            cardRadius: { label: "Card Radius", desc: "Card corner rounding" },
          }
          return (
            <SettingRow
              key={key}
              label={labels[key].label}
              description={labels[key].desc}
              last={idx === arr.length - 1}
            >
              <Select
                value={prefs[key] || "medium"}
                onChange={(v) => updatePref(key, v)}
                options={[
                  { value: "none", label: "None" },
                  { value: "small", label: "Small" },
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                  { value: "full", label: "Full" },
                ]}
                label={labels[key].label}
              />
            </SettingRow>
          )
        })}
        <SettingRow label="Avatar Radius" description="Avatar shape" last>
          <Select
            value={prefs.avatarRadius || "full"}
            onChange={(v) => updatePref("avatarRadius", v)}
            options={[
              { value: "none", label: "Square" },
              { value: "small", label: "Rounded" },
              { value: "medium", label: "Medium" },
              { value: "full", label: "Circle" },
            ]}
            label="Avatar Radius"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.shadows", "Shadows & Borders")} icon={Layers}>
        <SettingRow
          label={t("settings.appearance.shadowIntensity", "Shadow Intensity")}
          description={t("settings.appearance.shadowIntensityDesc", "Elevation shadow strength")}
        >
          <Select
            value={prefs.shadowIntensity || "medium"}
            onChange={(v) => updatePref("shadowIntensity", v)}
            options={[
              { value: "none", label: "None" },
              { value: "light", label: "Light" },
              { value: "medium", label: "Medium" },
              { value: "strong", label: "Strong" },
            ]}
            label="Shadow Intensity"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.borderWidth", "Border Width")}
          description={t("settings.appearance.borderWidthDesc", "Default border thickness")}
        >
          <Select
            value={prefs.borderWidth || "normal"}
            onChange={(v) => updatePref("borderWidth", v)}
            options={[
              { value: "none", label: "None" },
              { value: "thin", label: "Thin" },
              { value: "normal", label: "Normal" },
              { value: "thick", label: "Thick" },
            ]}
            label="Border Width"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.transitionDuration", "Transition Duration")}
          description={t("settings.appearance.transitionDurationDesc", "Animation speed for transitions")}
        >
          <Select
            value={prefs.transitionDuration || "normal"}
            onChange={(v) => updatePref("transitionDuration", v)}
            options={[
              { value: "fast", label: "Fast" },
              { value: "normal", label: "Normal" },
              { value: "slow", label: "Slow" },
            ]}
            label="Transition Duration"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.animationSpeed", "Animation Speed")}
          description={t("settings.appearance.animationSpeedDesc", "Overall UI animation speed")}
          last
        >
          <Select
            value={prefs.animationSpeed || "normal"}
            onChange={(v) => updatePref("animationSpeed", v)}
            options={[
              { value: "none", label: "Off" },
              { value: "slow", label: "Slow" },
              { value: "normal", label: "Normal" },
              { value: "fast", label: "Fast" },
            ]}
            label="Animation Speed"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.layout", "Layout & Spacing")} icon={Grid3X3}>
        <SettingRow
          label={t("settings.appearance.compactMode", "Compact Mode")}
          description={t("settings.appearance.compactModeDesc", "Reduce overall spacing")}
        >
          <Toggle value={prefs.compactMode ?? false} onValueChange={(v) => updatePref("compactMode", v)} />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.messageSpacing", "Message Spacing")}
          description={t("settings.appearance.messageSpacingDesc", "Space between messages")}
        >
          <Select
            value={prefs.messageSpacing || "normal"}
            onChange={(v) => updatePref("messageSpacing", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "relaxed", label: "Relaxed" },
            ]}
            label="Message Spacing"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.elementGap", "Element Gap")}
          description={t("settings.appearance.elementGapDesc", "Gap between inline elements")}
        >
          <Select
            value={prefs.elementGap || "normal"}
            onChange={(v) => updatePref("elementGap", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "wide", label: "Wide" },
            ]}
            label="Element Gap"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.listDensity", "List Density")}
          description={t("settings.appearance.listDensityDesc", "How tightly packed lists are")}
          last
        >
          <Select
            value={prefs.listDensity || "normal"}
            onChange={(v) => updatePref("listDensity", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "relaxed", label: "Relaxed" },
            ]}
            label="List Density"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.messageDisplay", "Message Display")} icon={MessageSquare}>
        <SettingRow
          label={t("settings.appearance.chatBubbleStyle", "Chat Bubble Style")}
          description={t("settings.appearance.chatBubbleStyleDesc", "Shape of message bubbles")}
        >
          <Select
            value={prefs.chatBubbleStyle || "rounded"}
            onChange={(v) => updatePref("chatBubbleStyle", v)}
            options={[
              { value: "rounded", label: "Rounded" },
              { value: "flat", label: "Flat" },
              { value: "minimal", label: "Minimal" },
            ]}
            label="Bubble Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.dateSeparator", "Date Separator")}
          description={t("settings.appearance.dateSeparatorDesc", "Show date separators between days")}
        >
          <Select
            value={prefs.dateSeparator || "full"}
            onChange={(v) => updatePref("dateSeparator", v)}
            options={[
              { value: "full", label: "Full date" },
              { value: "short", label: "Short" },
              { value: "none", label: "None" },
            ]}
            label="Date Separator"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.timeFormat", "Time Format")}
          description={t("settings.appearance.timeFormatDesc", "12h or 24h clock")}
        >
          <Select
            value={prefs.timeFormat || "12h"}
            onChange={(v) => updatePref("timeFormat", v)}
            options={[
              { value: "12h", label: "12h" },
              { value: "24h", label: "24h" },
            ]}
            label="Time Format"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.showTimestamps", "Show Timestamps")}
          description={t("settings.appearance.showTimestampsDesc", "When to show timestamps")}
        >
          <Select
            value={prefs.showTimestamps || "always"}
            onChange={(v) => updatePref("showTimestamps", v)}
            options={[
              { value: "always", label: "Always" },
              { value: "hover", label: "On hover" },
              { value: "off", label: "Off" },
            ]}
            label="Show Timestamps"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.animatedEmoji", "Animated Emoji")}
          description={t("settings.appearance.animatedEmojiDesc", "Animate emoji in messages")}
        >
          <Toggle value={prefs.animatedEmoji !== false} onValueChange={(v) => updatePref("animatedEmoji", v)} />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.imagePreviewSize", "Image Preview Size")}
          description={t("settings.appearance.imagePreviewSizeDesc", "Size of inline image previews")}
        >
          <Select
            value={prefs.imagePreviewSize || "medium"}
            onChange={(v) => updatePref("imagePreviewSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            label="Image Preview Size"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.avatarSizeList", "Avatar Size (List)")}
          description={t("settings.appearance.avatarSizeListDesc", "Avatar size in conversation list")}
        >
          <Select
            value={prefs.avatarSize || "medium"}
            onChange={(v) => updatePref("avatarSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            label="Avatar Size (List)"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.avatarSizeChat", "Avatar Size (Chat)")}
          description={t("settings.appearance.avatarSizeChatDesc", "Avatar size in chat messages")}
        >
          <Select
            value={prefs.avatarChatSize || "medium"}
            onChange={(v) => updatePref("avatarChatSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            label="Avatar Size (Chat)"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.avatarPresenceDot", "Avatar Presence Dot")}
          description={t("settings.appearance.avatarPresenceDotDesc", "Size of online indicator dot")}
          last
        >
          <Select
            value={prefs.avatarPresenceSize || "small"}
            onChange={(v) => updatePref("avatarPresenceSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            label="Presence Dot Size"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.contentStyling", "Content Styling")} icon={Hash}>
        <SettingRow
          label={t("settings.appearance.codeBlockTheme", "Code Block Theme")}
          description={t("settings.appearance.codeBlockThemeDesc", "Theme for code syntax highlighting")}
        >
          <Select
            value={prefs.codeBlockTheme || "dark"}
            onChange={(v) => updatePref("codeBlockTheme", v)}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "auto", label: "Auto" },
            ]}
            label="Code Block Theme"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.inlineCodeStyle", "Inline Code Style")}
          description={t("settings.appearance.inlineCodeStyleDesc", "Visual style of inline code")}
        >
          <Select
            value={prefs.inlineCodeStyle || "modern"}
            onChange={(v) => updatePref("inlineCodeStyle", v)}
            options={[
              { value: "modern", label: "Modern" },
              { value: "classic", label: "Classic" },
              { value: "minimal", label: "Minimal" },
            ]}
            label="Inline Code Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.linkStyle", "Link Style")}
          description={t("settings.appearance.linkStyleDesc", "How links are displayed")}
        >
          <Select
            value={prefs.linkStyle || "both"}
            onChange={(v) => updatePref("linkStyle", v)}
            options={[
              { value: "underline", label: "Underline" },
              { value: "colored", label: "Colored" },
              { value: "both", label: "Both" },
            ]}
            label="Link Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.mentionStyle", "Mention Style")}
          description={t("settings.appearance.mentionStyleDesc", "How @mentions are highlighted")}
        >
          <Select
            value={prefs.mentionStyle || "highlight"}
            onChange={(v) => updatePref("mentionStyle", v)}
            options={[
              { value: "highlight", label: "Highlight" },
              { value: "bold", label: "Bold" },
              { value: "both", label: "Both" },
            ]}
            label="Mention Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.spoilerStyle", "Spoiler Style")}
          description={t("settings.appearance.spoilerStyleDesc", "How spoiler content is hidden")}
        >
          <Select
            value={prefs.spoilerStyle || "blur"}
            onChange={(v) => updatePref("spoilerStyle", v)}
            options={[
              { value: "blur", label: "Blur" },
              { value: "hidden", label: "Hidden" },
              { value: "reveal", label: "Reveal on click" },
            ]}
            label="Spoiler Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.blockquoteStyle", "Blockquote Style")}
          description={t("settings.appearance.blockquoteStyleDesc", "Visual style of blockquotes")}
        >
          <Select
            value={prefs.blockquoteStyle || "line"}
            onChange={(v) => updatePref("blockquoteStyle", v)}
            options={[
              { value: "line", label: "Line" },
              { value: "accent", label: "Accent" },
              { value: "modern", label: "Modern" },
            ]}
            label="Blockquote Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.headingStyle", "Heading Style")}
          description={t("settings.appearance.headingStyleDesc", "Visual style of message headings")}
          last
        >
          <Select
            value={prefs.headingStyle || "default"}
            onChange={(v) => updatePref("headingStyle", v)}
            options={[
              { value: "default", label: "Default" },
              { value: "accent", label: "Accent" },
              { value: "underlined", label: "Underlined" },
            ]}
            label="Heading Style"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.scrollbar", "Scrollbar & Navigation")} icon={Sliders}>
        <SettingRow
          label={t("settings.appearance.scrollbarStyle", "Scrollbar Style")}
          description={t("settings.appearance.scrollbarStyleDesc", "Scrollbar appearance")}
        >
          <Select
            value={prefs.scrollbarStyle || "default"}
            onChange={(v) => updatePref("scrollbarStyle", v)}
            options={[
              { value: "default", label: "Default" },
              { value: "thin", label: "Thin" },
              { value: "hidden", label: "Hidden" },
            ]}
            label="Scrollbar Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.scrollBehavior", "Scroll Behavior")}
          description={t("settings.appearance.scrollBehaviorDesc", "Scrolling animation")}
        >
          <Select
            value={prefs.scrollBehavior || "smooth"}
            onChange={(v) => updatePref("scrollBehavior", v)}
            options={[
              { value: "smooth", label: "Smooth" },
              { value: "instant", label: "Instant" },
            ]}
            label="Scroll Behavior"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.stickyHeader", "Sticky Header")}
          description={t("settings.appearance.stickyHeaderDesc", "Keep headers fixed while scrolling")}
          last
        >
          <Toggle value={prefs.stickyHeader !== false} onValueChange={(v) => updatePref("stickyHeader", v)} />
        </SettingRow>
      </Section>

      <Section title={t("settings.appearance.animations", "Animations & Effects")} icon={Zap}>
        <SettingRow
          label={t("settings.appearance.reduceMotion", "Reduce Motion")}
          description={t("settings.appearance.reduceMotionDesc", "Minimize all animations")}
        >
          <Toggle value={prefs.reduceMotion ?? false} onValueChange={(v) => updatePref("reduceMotion", v)} />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.reduceTransparency", "Reduce Transparency")}
          description={t("settings.appearance.reduceTransparencyDesc", "Reduce blur effects")}
        >
          <Toggle
            value={prefs.reduceTransparency ?? false}
            onValueChange={(v) => updatePref("reduceTransparency", v)}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.pageTransition", "Page Transition")}
          description={t("settings.appearance.pageTransitionDesc", "Transition between pages")}
        >
          <Select
            value={prefs.pageTransition || "fade"}
            onChange={(v) => updatePref("pageTransition", v)}
            options={[
              { value: "fade", label: "Fade" },
              { value: "slide", label: "Slide" },
              { value: "scale", label: "Scale" },
              { value: "none", label: "None" },
            ]}
            label="Page Transition"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.messageAnimation", "Message Animation")}
          description={t("settings.appearance.messageAnimationDesc", "New message appearance animation")}
        >
          <Select
            value={prefs.messageAnimation || "fade"}
            onChange={(v) => updatePref("messageAnimation", v)}
            options={[
              { value: "fade", label: "Fade" },
              { value: "slide", label: "Slide" },
              { value: "scale", label: "Scale" },
              { value: "none", label: "None" },
            ]}
            label="Message Animation"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.reactionAnimation", "Reaction Animation")}
          description={t("settings.appearance.reactionAnimationDesc", "Emoji reaction animation")}
        >
          <Select
            value={prefs.reactionAnimation || "pop"}
            onChange={(v) => updatePref("reactionAnimation", v)}
            options={[
              { value: "bounce", label: "Bounce" },
              { value: "pop", label: "Pop" },
              { value: "fade", label: "Fade" },
              { value: "none", label: "None" },
            ]}
            label="Reaction Animation"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.skeletonStyle", "Skeleton Style")}
          description={t("settings.appearance.skeletonStyleDesc", "Loading placeholder animation")}
        >
          <Select
            value={prefs.skeletonStyle || "shimmer"}
            onChange={(v) => updatePref("skeletonStyle", v)}
            options={[
              { value: "shimmer", label: "Shimmer" },
              { value: "pulse", label: "Pulse" },
              { value: "none", label: "None" },
            ]}
            label="Skeleton Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.typingIndicator", "Typing Indicator")}
          description={t("settings.appearance.typingIndicatorDesc", "Typing animation style")}
        >
          <Select
            value={prefs.typingIndicatorStyle || "dots"}
            onChange={(v) => updatePref("typingIndicatorStyle", v)}
            options={[
              { value: "dots", label: "Bouncing dots" },
              { value: "pulse", label: "Pulse" },
              { value: "text", label: "Text only" },
            ]}
            label="Typing Indicator"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.badgeStyle", "Badge Style")}
          description={t("settings.appearance.badgeStyleDesc", "Notification badge appearance")}
        >
          <Select
            value={prefs.badgeStyle || "pill"}
            onChange={(v) => updatePref("badgeStyle", v)}
            options={[
              { value: "dot", label: "Dot" },
              { value: "pill", label: "Pill" },
              { value: "number", label: "Number" },
            ]}
            label="Badge Style"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.notificationDotSize", "Notification Dot Size")}
          description={t("settings.appearance.notificationDotSizeDesc", "Size of online status dots")}
          last
        >
          <Select
            value={prefs.notificationDotSize || "medium"}
            onChange={(v) => updatePref("notificationDotSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            label="Dot Size"
          />
        </SettingRow>
      </Section>

      <Section title={t("settings.status.oneliner", "One-Liner Status")} icon={MessageCircle}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <TextInput
            style={[
              ss.timeInput,
              { backgroundColor: c.inputBg, color: c.text, borderColor: c.border, flex: 1, paddingVertical: 10 },
            ]}
            value={customStatusText}
            onChangeText={setCustomStatusText}
            placeholder="What's on your mind?"
            placeholderTextColor={c.textMuted}
            maxLength={80}
          />
          <TouchableOpacity
            style={[ss.btnSm, { backgroundColor: c.accent }]}
            onPress={saveCustomStatus}
            disabled={savingCustomStatus}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{t("settings.status.set", "Set")}</Text>
          </TouchableOpacity>
        </View>
        {customStatusMsg ? (
          <Text style={{ color: c.accent, fontSize: 12, marginTop: 4 }}>{customStatusMsg}</Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
          <TextInput
            style={[
              ss.timeInput,
              {
                backgroundColor: c.inputBg,
                color: c.text,
                borderColor: c.border,
                width: 56,
                textAlign: "center",
                fontSize: 18,
              },
            ]}
            value={statusEmojiLocal}
            onChangeText={setStatusEmojiLocal}
            placeholder="😀"
            placeholderTextColor={c.textMuted}
            maxLength={2}
          />
          <TouchableOpacity onPress={clearStatusEmoji}>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              {t("settings.status.resetToDot", "Reset to colored dot")}
            </Text>
          </TouchableOpacity>
        </View>
        {statusEmojiSaveMsg ? (
          <Text style={{ color: c.accent, fontSize: 12, marginTop: 4 }}>{statusEmojiSaveMsg}</Text>
        ) : null}
      </Section>

      <Section title="Custom Themes" icon={Sparkles}>
        <TouchableOpacity
          style={[ss.btnInline, { backgroundColor: c.accent }]}
          onPress={() => setThemeEditorVisible(true)}
        >
          <Text style={ss.btnInlineText}>Open Theme Editor</Text>
        </TouchableOpacity>
        {themeEditorVisible && (
          <Modal visible transparent animationType="slide" onRequestClose={() => setThemeEditorVisible(false)}>
            <View style={[ss.overlay, { backgroundColor: c.overlay }]}>
              <View
                style={[
                  ss.modal,
                  { backgroundColor: c.surface, borderColor: c.border, maxHeight: "80%", width: "90%" },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text style={[ss.modalTitle, { color: c.text }]}>Theme Editor</Text>
                  <TouchableOpacity onPress={() => setThemeEditorVisible(false)}>
                    <Text style={{ color: c.textSecondary, fontSize: 15 }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {(
                    [
                      "bg-primary",
                      "bg-secondary",
                      "surface",
                      "border",
                      "accent",
                      "accent-hover",
                      "text-primary",
                      "text-secondary",
                      "text-muted",
                    ] as const
                  ).map((key) => (
                    <View key={key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 }}>
                      <View
                        style={[
                          ss.colorSwatch,
                          {
                            backgroundColor:
                              prefs[key] ||
                              (key.startsWith("text") ? "#E8E8F0" : key.startsWith("bg") ? "#0A0A0F" : "#181825"),
                          },
                        ]}
                      />
                      <Text style={{ color: c.textMuted, fontSize: 11, width: 100 }}>{key}</Text>
                      <TextInput
                        style={[ss.colorInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                        value={prefs[key] || ""}
                        onChangeText={(v) => updatePref(key, v)}
                        placeholder="#hex"
                        placeholderTextColor={c.textMuted}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </Section>
    </View>
  )
}

/* ---------- NOTIFICATIONS ---------- */

function NotificationSettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  const { c } = useTheme()
  const notifications = [
    { key: "messageNotifications", label: "Messages" },
    { key: "groupNotifications", label: "Groups" },
    { key: "communityNotifications", label: "Communities" },
    { key: "eventNotifications", label: "Events" },
    { key: "callNotifications", label: "Calls" },
  ]
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Push & In-App" icon={Bell}>
        {notifications.map((n, i) => (
          <SettingRow key={n.key} label={n.label} last={i === notifications.length - 1}>
            <Toggle value={prefs[n.key] !== false} onValueChange={(v) => updatePref(n.key, v)} />
          </SettingRow>
        ))}
      </Section>
      <Section title="Delivery" icon={MessageSquare}>
        <SettingRow label="Message Previews">
          <Toggle value={prefs.messagePreviews !== false} onValueChange={(v) => updatePref("messagePreviews", v)} />
        </SettingRow>
        <SettingRow label="Push Notifications" last>
          <Toggle value={prefs.pushNotifications !== false} onValueChange={(v) => updatePref("pushNotifications", v)} />
        </SettingRow>
      </Section>
      <Section title="Sounds" icon={Mic}>
        <SettingRow label="Notification Sounds">
          <Toggle
            value={prefs.notificationSounds !== false}
            onValueChange={(v) => updatePref("notificationSounds", v)}
          />
        </SettingRow>
        <SettingRow label="Sound" description={prefs.notificationSoundName || "default"}>
          <Select
            value={prefs.notificationSoundName || "default"}
            onChange={(v) => updatePref("notificationSoundName", v)}
            options={[
              { value: "default", label: "Default" },
              { value: "chime", label: "Chime" },
              { value: "pop", label: "Pop" },
              { value: "bell", label: "Bell" },
              { value: "none", label: "None" },
            ]}
            label="Sound"
          />
        </SettingRow>
        <SettingRow label="Volume" description={`${prefs.notificationVolume ?? 80}%`} last>
          <SliderControl
            value={prefs.notificationVolume ?? 80}
            min={0}
            max={100}
            onChange={(v) => updatePref("notificationVolume", v)}
          />
        </SettingRow>
      </Section>
      <Section title="Quiet Hours" icon={Lock}>
        <SettingRow label="Do Not Disturb">
          <Toggle value={prefs.dndEnabled ?? false} onValueChange={(v) => updatePref("dndEnabled", v)} />
        </SettingRow>
        {prefs.dndEnabled && (
          <>
            <SettingRow label="From">
              <TextInput
                style={[ss.timeInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                value={prefs.dndStart || "22:00"}
                onChangeText={(v) => updatePref("dndStart", v)}
                placeholder="22:00"
                placeholderTextColor={c.textMuted}
              />
            </SettingRow>
            <SettingRow label="To">
              <TextInput
                style={[ss.timeInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                value={prefs.dndEnd || "08:00"}
                onChangeText={(v) => updatePref("dndEnd", v)}
                placeholder="08:00"
                placeholderTextColor={c.textMuted}
              />
            </SettingRow>
          </>
        )}
        <SettingRow label="Mentions Only">
          <Toggle value={prefs.mentionsOnly ?? false} onValueChange={(v) => updatePref("mentionsOnly", v)} />
        </SettingRow>
        <SettingRow label="Badge Count" last>
          <Toggle value={prefs.badgeCount !== false} onValueChange={(v) => updatePref("badgeCount", v)} />
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- PRIVACY ---------- */

function PrivacySettings({
  user,
  prefs,
  updatePref,
}: {
  user: any
  prefs: any
  updatePref: (k: string, v: any) => void
}) {
  const { c } = useTheme()
  const [blocked, setBlocked] = useState<any[]>([])
  useEffect(() => {
    api<any[]>("/api/privacy/blocks")
      .then(setBlocked)
      .catch(() => {})
  }, [])
  const unblock = (userId: string) => {
    api(`/api/privacy/blocks/${userId}`, { method: "DELETE" })
      .then(() => setBlocked((p) => p.filter((b) => b.id !== userId)))
      .catch(() => {})
  }

  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Presence" icon={Eye}>
        <SettingRow label="Show Online Status">
          <Toggle value={prefs.showOnlineStatus !== false} onValueChange={(v) => updatePref("showOnlineStatus", v)} />
        </SettingRow>
        <SettingRow label="Share Activity" last>
          <Toggle value={prefs.shareActivity !== false} onValueChange={(v) => updatePref("shareActivity", v)} />
        </SettingRow>
      </Section>
      <Section title="Messaging" icon={MessageSquare}>
        <SettingRow label="Read Receipts">
          <Toggle value={prefs.readReceipts !== false} onValueChange={(v) => updatePref("readReceipts", v)} />
        </SettingRow>
        <SettingRow label="Allow DMs from anyone" last>
          <Toggle value={prefs.allowDMs === true} onValueChange={(v) => updatePref("allowDMs", v)} />
        </SettingRow>
      </Section>
      <Section title="Safety" icon={Shield}>
        <SettingRow label="Explicit Content Filter" last>
          <Toggle value={prefs.explicitFilter !== false} onValueChange={(v) => updatePref("explicitFilter", v)} />
        </SettingRow>
      </Section>
      <Section title="Blocked Users" icon={Lock}>
        {blocked.length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>No blocked users</Text>
        ) : (
          blocked.map((b, i) => (
            <SettingRow key={b.id} label={b.username || b.id} last={i === blocked.length - 1}>
              <TouchableOpacity
                onPress={() => unblock(b.id)}
                style={[ss.smallDangerBtn, { backgroundColor: "rgba(239,68,68,0.12)" }]}
              >
                <Text style={{ color: c.danger, fontSize: 12, fontWeight: "500" }}>Unblock</Text>
              </TouchableOpacity>
            </SettingRow>
          ))
        )}
      </Section>
    </View>
  )
}

/* ---------- CHAT ---------- */

function ChatSettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Messaging" icon={Send}>
        <SettingRow label="Enter to Send">
          <Toggle value={prefs.enterToSend !== false} onValueChange={(v) => updatePref("enterToSend", v)} />
        </SettingRow>
        <SettingRow label="Typing Indicators">
          <Toggle value={prefs.typingIndicators !== false} onValueChange={(v) => updatePref("typingIndicators", v)} />
        </SettingRow>
        <SettingRow label="Message Grouping">
          <Toggle value={prefs.messageGrouping !== false} onValueChange={(v) => updatePref("messageGrouping", v)} />
        </SettingRow>
        <SettingRow label="Reply Preview" last>
          <Toggle value={prefs.replyPreview !== false} onValueChange={(v) => updatePref("replyPreview", v)} />
        </SettingRow>
      </Section>
      <Section title="Content" icon={Hash}>
        <SettingRow label="Image Previews">
          <Toggle value={prefs.imagePreviews !== false} onValueChange={(v) => updatePref("imagePreviews", v)} />
        </SettingRow>
        <SettingRow label="Link Previews">
          <Toggle value={prefs.linkPreviews !== false} onValueChange={(v) => updatePref("linkPreviews", v)} />
        </SettingRow>
        <SettingRow label="Emoji Suggestions" last>
          <Toggle value={prefs.emojiSuggestions !== false} onValueChange={(v) => updatePref("emojiSuggestions", v)} />
        </SettingRow>
      </Section>
      <Section title="Input" icon={Type}>
        <SettingRow label="Spell Check">
          <Toggle value={prefs.spellCheck !== false} onValueChange={(v) => updatePref("spellCheck", v)} />
        </SettingRow>
        <SettingRow label="Auto-Correct" last>
          <Toggle value={prefs.autoCorrect !== false} onValueChange={(v) => updatePref("autoCorrect", v)} />
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- CALLS ---------- */

function CallSettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Audio" icon={Mic}>
        <SettingRow label="Echo Cancellation">
          <Toggle value={prefs.echoCancellation !== false} onValueChange={(v) => updatePref("echoCancellation", v)} />
        </SettingRow>
        <SettingRow label="Noise Suppression">
          <Toggle value={prefs.noiseSuppression !== false} onValueChange={(v) => updatePref("noiseSuppression", v)} />
        </SettingRow>
        <SettingRow label="Auto Gain Control" last>
          <Toggle value={prefs.autoGainControl !== false} onValueChange={(v) => updatePref("autoGainControl", v)} />
        </SettingRow>
      </Section>
      <Section title="Video" icon={Camera}>
        <SettingRow label="Auto-enable Camera" last>
          <Toggle value={prefs.autoEnableCamera !== false} onValueChange={(v) => updatePref("autoEnableCamera", v)} />
        </SettingRow>
      </Section>
      <Section title="Advanced" icon={Sliders}>
        <SettingRow label="Call Recording" last>
          <Toggle value={prefs.callRecording === true} onValueChange={(v) => updatePref("callRecording", v)} />
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- MEDIA ---------- */

function MediaSettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Images & Video" icon={Camera}>
        <SettingRow label="Auto-play GIFs">
          <Toggle value={prefs.autoplayGIFs !== false} onValueChange={(v) => updatePref("autoplayGIFs", v)} />
        </SettingRow>
        <SettingRow label="Video Autoplay">
          <Toggle value={prefs.videoAutoplay !== false} onValueChange={(v) => updatePref("videoAutoplay", v)} />
        </SettingRow>
        <SettingRow label="Save to Gallery" last>
          <Toggle value={prefs.saveToGallery === true} onValueChange={(v) => updatePref("saveToGallery", v)} />
        </SettingRow>
      </Section>
      <Section title="Files" icon={MessageSquare}>
        <SettingRow label="Auto-download">
          <Toggle value={prefs.autoDownload !== false} onValueChange={(v) => updatePref("autoDownload", v)} />
        </SettingRow>
        <SettingRow label="Max File Size" last>
          <Select
            value={String(prefs.maxFileSize || "25")}
            onChange={(v) => updatePref("maxFileSize", parseInt(v))}
            options={[
              { value: "10", label: "10 MB" },
              { value: "25", label: "25 MB" },
              { value: "50", label: "50 MB" },
              { value: "100", label: "100 MB" },
            ]}
            label="Max File Size"
          />
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- AUDIO & VIDEO ---------- */

function AudioVideoSettings() {
  const { c } = useTheme()
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Input / Output" icon={Mic}>
        <SettingRow label="Microphone" last>
          <Text style={[ss.value, { color: c.textMuted }]}>System Default</Text>
        </SettingRow>
      </Section>
      <Section title="Output" icon={MessageSquare}>
        <SettingRow label="Speaker" last>
          <Text style={[ss.value, { color: c.textMuted }]}>System Default</Text>
        </SettingRow>
      </Section>
      <Section title="Video" icon={Camera}>
        <SettingRow label="Camera" last>
          <Text style={[ss.value, { color: c.textMuted }]}>System Default</Text>
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- ACCESSIBILITY ---------- */

function AccessibilitySettings({ prefs, updatePref }: { prefs: any; updatePref: (k: string, v: any) => void }) {
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Vision" icon={Eye}>
        <SettingRow label="High Contrast">
          <Toggle value={prefs.highContrast === true} onValueChange={(v) => updatePref("highContrast", v)} />
        </SettingRow>
        <SettingRow label="Reduce Motion">
          <Toggle value={prefs.reduceMotion === true} onValueChange={(v) => updatePref("reduceMotion", v)} />
        </SettingRow>
        <SettingRow label="Font Size" last>
          <Select
            value={prefs.fontSize || "medium"}
            onChange={(v) => updatePref("fontSize", v)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
              { value: "xlarge", label: "Extra Large" },
            ]}
            label="Font Size"
          />
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- LANGUAGE ---------- */

function LanguageSettings() {
  const { c } = useTheme()
  const changeLang = (code: string) => i18n.changeLanguage(code)

  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Interface Language" icon={Globe}>
        {supportedLanguages.map((lang, i) => (
          <TouchableOpacity
            key={lang.code}
            style={[ss.langItem, i18n.language === lang.code && { backgroundColor: c.accentLight }]}
            onPress={() => changeLang(lang.code)}
          >
            <Text
              style={[
                ss.langName,
                { color: c.text },
                i18n.language === lang.code && { color: c.accent, fontWeight: "600" },
              ]}
            >
              {lang.native}
            </Text>
            <Text style={[ss.langCode, { color: c.textMuted }]}>{lang.name}</Text>
            {i18n.language === lang.code && <Text style={{ color: c.accent, marginLeft: 8, fontSize: 14 }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </Section>
      <Section title="Date & Time" icon={SettingsIcon}>
        <SettingRow label="Time Format">
          <Select
            value={"24h"}
            onChange={() => {}}
            options={[
              { value: "12h", label: "12-hour" },
              { value: "24h", label: "24-hour" },
            ]}
            label="Time Format"
          />
        </SettingRow>
        <SettingRow label="Date Format" last>
          <Select
            value={"DD/MM/YYYY"}
            onChange={() => {}}
            options={[
              { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
              { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
              { value: "YYYY/MM/DD", label: "YYYY/MM/DD" },
            ]}
            label="Date Format"
          />
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- SHORTCUTS ---------- */

function ShortcutsSettings() {
  const { c } = useTheme()
  const shortcuts = [
    { keys: "Ctrl+K", label: "Quick switch" },
    { keys: "Ctrl+N", label: "New message" },
    { keys: "Ctrl+Shift+N", label: "New group" },
    { keys: "Ctrl+Shift+E", label: "Search" },
    { keys: "Escape", label: "Close modal" },
    { keys: "Ctrl+,", label: "Open settings" },
    { keys: "Ctrl+Shift+T", label: "Toggle theme" },
    { keys: "Ctrl+B", label: "Toggle sidebar" },
  ]
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Keyboard Shortcuts" icon={Keyboard}>
        {shortcuts.map((s, i) => (
          <SettingRow key={i} label={s.keys} last={i === shortcuts.length - 1}>
            <Text style={[ss.value, { color: c.textMuted }]}>{s.label}</Text>
          </SettingRow>
        ))}
      </Section>
    </View>
  )
}

/* ---------- ADVANCED ---------- */

function AdvancedSettings() {
  const { c } = useTheme()
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    ;(async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default
        const raw = await AsyncStorage.getItem("offline:pending")
        if (raw) setPendingCount(JSON.parse(raw).length)
      } catch {}
    })()
  }, [])

  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Developer" icon={SettingsIcon}>
        <SettingRow label="Developer Mode">
          <Toggle value={false} onValueChange={() => {}} />
        </SettingRow>
        <SettingRow label="Experimental Features" last>
          <Toggle value={false} onValueChange={() => {}} />
        </SettingRow>
      </Section>
      <Section title="Performance" icon={Zap}>
        <SettingRow label="Cache Enabled" last>
          <Toggle value={true} onValueChange={() => {}} />
        </SettingRow>
      </Section>
      <Section title="Offline" icon={MessageSquare}>
        <SettingRow label="Pending Messages">
          <Text style={[ss.value, { color: c.textMuted }]}>{pendingCount} queued</Text>
        </SettingRow>
        <TouchableOpacity
          style={[ss.btnSm, { backgroundColor: c.accent }]}
          onPress={async () => {
            try {
              const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default
              await AsyncStorage.removeItem("offline:pending")
              setPendingCount(0)
            } catch {}
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Clear Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ss.btnSm, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, marginLeft: 8 }]}
          onPress={async () => {
            try {
              const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default
              await AsyncStorage.removeItem("offline:cached")
              Alert.alert("Cached messages cleared")
            } catch {}
          }}
        >
          <Text style={{ color: c.text, fontSize: 13, fontWeight: "500" }}>Clear Cached Messages</Text>
        </TouchableOpacity>
      </Section>
    </View>
  )
}

/* ---------- ABOUT ---------- */

function AboutSection() {
  const { c } = useTheme()
  return (
    <View style={{ paddingBottom: 40 }}>
      <Section title="Application Info" icon={Info}>
        <SettingRow label="Version">
          <Text style={[ss.value, { color: c.textMuted }]}>1.0.0</Text>
        </SettingRow>
        <SettingRow label="Platform">
          <Text style={[ss.value, { color: c.textMuted }]}>
            React Native {Platform.OS === "ios" ? "iOS" : "Android"}
          </Text>
        </SettingRow>
        <SettingRow label="Expo SDK">
          <Text style={[ss.value, { color: c.textMuted }]}>57</Text>
        </SettingRow>
        <SettingRow label="Protocol">
          <Text style={[ss.value, { color: c.textMuted }]}>WebSocket + REST</Text>
        </SettingRow>
        <SettingRow label="Encryption">
          <Text style={[ss.value, { color: c.textMuted }]}>NaCl (E2EE)</Text>
        </SettingRow>
        <SettingRow label="Server">
          <Text style={[ss.value, { color: c.textMuted }]}>Express + PostgreSQL + Redis</Text>
        </SettingRow>
        <SettingRow label="License" last>
          <Text style={[ss.value, { color: c.textMuted }]}>MIT</Text>
        </SettingRow>
      </Section>
    </View>
  )
}

/* ---------- STYLES ---------- */

const ss = StyleSheet.create({
  sectionCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13 },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15 },
  rowDesc: { fontSize: 11, marginTop: 2 },
  value: { fontSize: 14 },
  btnInline: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  btnInlineText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  btnSm: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  smallDangerBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { width: "100%", maxWidth: 360, borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 8, alignItems: "center" },
  colorSwatch: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "#252538" },
  colorInput: { flex: 1, borderRadius: 10, padding: 10, fontSize: 13, borderWidth: 1 },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  langName: { fontSize: 15, flex: 1 },
  langCode: { fontSize: 13 },
  timeInput: { borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, textAlign: "center" },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    gap: 4,
    minWidth: 90,
    justifyContent: "space-between",
  },
  selectSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, paddingBottom: 40 },
  selectHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 8 },
  selectSheetTitle: { fontSize: 17, fontWeight: "600", paddingVertical: 8, paddingHorizontal: 20, textAlign: "center" },
  selectItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  selectItemText: { fontSize: 15 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: "#FFFFFF" },
  sliderBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  sliderValue: { minWidth: 36, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
})

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    paddingTop: Platform.OS === "ios" ? 56 : 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  title: { fontSize: 17, fontWeight: "600" },
  catRow: { borderBottomWidth: 1, maxHeight: 56 },
  catContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 12, alignItems: "center" },
  catLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 4,
  },
  tabText: { fontSize: 12, fontWeight: "500" },
  content: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchCat: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
})
