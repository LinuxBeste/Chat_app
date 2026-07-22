import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { useTheme } from "../../lib/theme-context"
import { ThemeEditor } from "./theme-editor"
import {
  User, Shield, Palette, Bell, Lock, Info, History, Key, Check, Copy, Smartphone,
  Moon, Sun, Eye, LogOut, Mail,
} from "lucide-react"

interface TOTPStatus {
  enabled: boolean
}

interface LoginEntry {
  id: string
  ip: string | null
  userAgent: string | null
  success: string
  createdAt: string
}

type SettingsTab = "account" | "security" | "appearance" | "notifications" | "privacy" | "about"

interface TabDef {
  id: SettingsTab
  label: string
  icon: typeof User
}

const tabs: TabDef[] = [
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Safety", icon: Lock },
  { id: "about", label: "About", icon: Info },
]

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState<SettingsTab>("account")
  const [totpStatus, setTotpStatus] = useState<TOTPStatus | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([])
  const [secret, setSecret] = useState("")
  const [setupUri, setSetupUri] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [showVerify, setShowVerify] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState("")
  const [sendingVerification, setSendingVerification] = useState(false)

  useEffect(() => {
    if (tab === "security") {
      api<TOTPStatus>("/api/security/totp/status")
        .then(setTotpStatus)
        .catch(() => {})
      api<LoginEntry[]>("/api/security/history")
        .then(setLoginHistory)
        .catch(() => {})
    }
  }, [tab])

  const setupTOTP = async () => {
    const data = await api<{ secret: string; uri: string }>("/api/security/totp/setup", { method: "POST" }).catch(
      () => null,
    )
    if (data) {
      setSecret(data.secret)
      setSetupUri(data.uri)
      setShowVerify(true)
    }
  }

  const verifyTOTP = async () => {
    if (!verifyCode.trim()) return
    await api("/api/security/totp/verify", {
      method: "POST",
      body: JSON.stringify({ code: verifyCode.trim() }),
    }).catch(() => null)
    setTotpStatus({ enabled: true })
    setShowVerify(false)
    setVerifyCode("")
  }

  const disableTOTP = async () => {
    await api("/api/security/totp/disable", { method: "POST" }).catch(() => {})
    setTotpStatus({ enabled: false })
    setSecret("")
    setSetupUri("")
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString()

  const formatUA = (ua: string | null) => {
    if (!ua) return "Unknown"
    if (ua.includes("Chrome")) return "Chrome"
    if (ua.includes("Firefox")) return "Firefox"
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari"
    if (ua.includes("Expo")) return "Mobile App"
    return ua.slice(0, 30)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <nav className="w-52 shrink-0 border-r border-border bg-bg-secondary p-3 space-y-1 flex flex-col">
        <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Settings</div>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          )
        })}

        <div className="mt-auto pt-3 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger/5 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {/* ========== ACCOUNT ========== */}
          {tab === "account" && (
            <>
              <h1 className="text-lg font-semibold text-text-primary">Account</h1>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <User className="h-4 w-4 text-text-muted" />
                  Profile Info
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                  <div>
                    <span className="text-xs text-text-muted block">Username</span>
                    <span className="text-sm text-text-primary">@{user?.username}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Email</span>
                    <span className="text-sm text-text-primary">{user?.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Display Name</span>
                    <span className="text-sm text-text-primary">{user?.displayName || "—"}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Mail className="h-4 w-4 text-text-muted" />
                  Email Verification
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">{user?.email}</p>
                      <p className={`text-xs ${user?.emailVerified === "true" ? "text-green-400" : "text-yellow-400"}`}>
                        {user?.emailVerified === "true" ? "Verified" : "Not verified"}
                      </p>
                    </div>
                    {user?.emailVerified !== "true" && (
                      <button
                        onClick={async () => {
                          setSendingVerification(true)
                          setVerifyMsg("")
                          try {
                            const res = await api<{ verifyUrl: string }>("/api/auth/send-verification", { method: "POST" })
                            setVerifyMsg(`Verification link sent! ${res.verifyUrl}`)
                          } catch {
                            setVerifyMsg("Failed to send verification email")
                          }
                          setSendingVerification(false)
                        }}
                        disabled={sendingVerification}
                        className="text-xs text-accent hover:text-accent-hover cursor-pointer disabled:opacity-40"
                      >
                        {sendingVerification ? "Sending..." : "Verify Email"}
                      </button>
                    )}
                  </div>
                  {verifyMsg && <p className="text-xs text-text-muted break-all">{verifyMsg}</p>}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-text-muted" />
                  Active Sessions
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm text-text-muted">Session management coming soon.</p>
                </div>
              </section>
            </>
          )}

          {/* ========== SECURITY ========== */}
          {tab === "security" && (
            <>
              <h1 className="text-lg font-semibold text-text-primary">Security</h1>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Shield className="h-4 w-4 text-text-muted" />
                  Two-Factor Authentication
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  {totpStatus === null && <p className="text-sm text-text-muted">Loading...</p>}
                  {totpStatus && !totpStatus.enabled && !showVerify && (
                    <div className="space-y-3">
                      <p className="text-sm text-text-muted">
                        2FA is not enabled. Add an extra layer of security to your account.
                      </p>
                      <button
                        onClick={setupTOTP}
                        className="h-10 rounded-2xl bg-accent text-white text-sm px-4 font-medium hover:bg-accent-hover transition-all cursor-pointer"
                      >
                        <Key className="h-4 w-4 inline mr-1.5" />
                        Enable 2FA
                      </button>
                    </div>
                  )}
                  {totpStatus && totpStatus.enabled && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-text-primary">2FA is enabled</span>
                      </div>
                      <button
                        onClick={disableTOTP}
                        className="h-10 rounded-2xl border border-danger/30 text-danger text-sm px-4 font-medium hover:bg-danger/5 transition-all cursor-pointer"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  )}
                  {showVerify && (
                    <div className="space-y-3 mt-3">
                      <p className="text-sm font-medium text-text-primary">Scan this QR code or enter the secret manually</p>
                      <div className="flex items-center gap-2 rounded-xl bg-bg-primary p-3">
                        <code className="text-xs text-accent break-all flex-1">{secret}</code>
                        <button
                          onClick={copySecret}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-all cursor-pointer"
                          aria-label="Copy secret"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted">
                        Or use URI: <code className="text-xs text-accent">{setupUri}</code>
                      </p>
                      <input
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="Enter 6-digit code from authenticator app"
                        maxLength={6}
                        className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={verifyTOTP}
                          disabled={verifyCode.length !== 6}
                          className="h-10 rounded-2xl bg-accent text-white text-sm px-4 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                        >
                          Verify & Enable
                        </button>
                        <button
                          onClick={() => setShowVerify(false)}
                          className="h-10 rounded-2xl border border-border text-text-secondary text-sm px-4 font-medium hover:bg-white/5 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <History className="h-4 w-4 text-text-muted" />
                  Login History
                </h2>
                <div className="space-y-1.5">
                  {loginHistory.length === 0 && <p className="text-sm text-text-muted">No login history</p>}
                  {loginHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                    >
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${entry.success === "true" ? "bg-green-500" : "bg-danger"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{formatUA(entry.userAgent)}</p>
                        <p className="text-xs text-text-muted">
                          {entry.ip ?? "Unknown IP"} · {formatDate(entry.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium capitalize ${entry.success === "true" ? "text-green-500" : "text-danger"}`}
                      >
                        {entry.success === "true" ? "Success" : "Failed"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ========== APPEARANCE ========== */}
          {tab === "appearance" && (
            <>
              <h1 className="text-lg font-semibold text-text-primary">Appearance</h1>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4 text-text-muted" /> : <Sun className="h-4 w-4 text-text-muted" />}
                  Theme Mode
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">Appearance</p>
                      <p className="text-xs text-text-muted">Switch between light and dark mode</p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative h-7 w-12 rounded-full transition-colors cursor-pointer ${
                        theme === "dark" ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                          theme === "dark" ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <ThemeEditor />
            </>
          )}

          {/* ========== NOTIFICATIONS ========== */}
          {tab === "notifications" && (
            <>
              <h1 className="text-lg font-semibold text-text-primary">Notifications</h1>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Bell className="h-4 w-4 text-text-muted" />
                  Notification Preferences
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                  {[
                    { label: "Messages", desc: "New message notifications" },
                    { label: "Group Invites", desc: "When someone invites you to a group" },
                    { label: "Community Updates", desc: "New channels, member changes" },
                    { label: "Event Reminders", desc: "Reminders for upcoming events" },
                    { label: "Call Alerts", desc: "Incoming call notifications" },
                  ].map((n) => (
                    <div key={n.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-primary">{n.label}</p>
                        <p className="text-xs text-text-muted">{n.desc}</p>
                      </div>
                      <div className="h-6 w-10 rounded-full bg-accent/30 cursor-pointer relative">
                        <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-accent shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ========== PRIVACY ========== */}
          {tab === "privacy" && (
            <>
              <h1 className="text-lg font-semibold text-text-primary">Privacy & Safety</h1>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Eye className="h-4 w-4 text-text-muted" />
                  Privacy
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                  {[
                    { label: "Read Receipts", desc: "Let others see when you've read their messages" },
                    { label: "Show Online Status", desc: "Allow others to see when you're online" },
                    { label: "Allow Friend Requests", desc: "Who can send you friend requests" },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-primary">{p.label}</p>
                        <p className="text-xs text-text-muted">{p.desc}</p>
                      </div>
                      <div className="h-6 w-10 rounded-full bg-accent/30 cursor-pointer relative">
                        <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-accent shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Lock className="h-4 w-4 text-text-muted" />
                  Blocked Users
                </h2>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm text-text-muted">No blocked users yet.</p>
                </div>
              </section>
            </>
          )}

          {/* ========== ABOUT ========== */}
          {tab === "about" && (
            <>
              <h1 className="text-lg font-semibold text-text-primary">About</h1>

              <section className="space-y-3">
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                  <div>
                    <span className="text-xs text-text-muted block">Version</span>
                    <span className="text-sm text-text-primary">1.0.0</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Server</span>
                    <span className="text-sm text-text-primary">Express + PostgreSQL + Redis</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Client</span>
                    <span className="text-sm text-text-primary">React + Tailwind CSS</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
