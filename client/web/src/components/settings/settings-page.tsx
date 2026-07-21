import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { Shield, Key, History, Smartphone, Check, Copy } from "lucide-react"

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

export function SettingsPage() {
  const { user } = useAuth()
  const [totpStatus, setTotpStatus] = useState<TOTPStatus | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([])
  const [secret, setSecret] = useState("")
  const [setupUri, setSetupUri] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [showVerify, setShowVerify] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api<TOTPStatus>("/api/security/totp/status").then(setTotpStatus).catch(() => {})
    api<LoginEntry[]>("/api/security/history").then(setLoginHistory).catch(() => {})
  }, [])

  const setupTOTP = async () => {
    const data = await api<{ secret: string; uri: string }>("/api/security/totp/setup", { method: "POST" }).catch(() => null)
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
    <div className="flex h-full overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto p-6 space-y-8">
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>

        {/* Profile */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-text-muted" />
            Account
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

        {/* 2FA */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-muted" />
            Two-Factor Authentication
          </h2>
          <div className="rounded-2xl border border-border bg-surface p-4">
            {totpStatus === null && <p className="text-sm text-text-muted">Loading...</p>}
            {totpStatus && !totpStatus.enabled && !showVerify && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">2FA is not enabled. Add an extra layer of security to your account.</p>
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
                <p className="text-xs text-text-muted">Or use URI: <code className="text-xs text-accent">{setupUri}</code></p>
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

        {/* Login History */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <History className="h-4 w-4 text-text-muted" />
            Login History
          </h2>
          <div className="space-y-1.5">
            {loginHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${entry.success === "true" ? "bg-green-500" : "bg-danger"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">{formatUA(entry.userAgent)}</p>
                  <p className="text-xs text-text-muted">{entry.ip ?? "Unknown IP"} · {formatDate(entry.createdAt)}</p>
                </div>
                <span className={`text-xs font-medium capitalize ${entry.success === "true" ? "text-green-500" : "text-danger"}`}>
                  {entry.success === "true" ? "Success" : "Failed"}
                </span>
              </div>
            ))}
            {loginHistory.length === 0 && (
              <p className="text-sm text-text-muted">No login history</p>
            )}
          </div>
        </section>

        {/* Sessions (placeholder for future) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-text-muted" />
            Active Sessions
          </h2>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-text-muted">Session management coming soon.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
