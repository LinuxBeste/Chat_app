import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { Shield, Users, MessageSquare, FileText, AlertTriangle, Ban, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

interface Stats {
  users: number
  conversations: number
  messages: number
  reports: number
  bans: number
}

interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  status: string
  createdAt: string
}

interface AdminReport {
  id: string
  reportedBy: string
  targetUserId: string | null
  targetMessageId: string | null
  reason: string
  status: string
  createdAt: string
}

interface Ban {
  id: string
  conversationId: string
  userId: string
  bannedBy: string
  reason: string | null
  createdAt: string
}

type Tab = "overview" | "users" | "reports" | "bans"

export function AdminPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>("overview")
  const [stats, setStats] = useState<Stats | null>(null)
  const [userList, setUserList] = useState<User[]>([])
  const [reportList, setReportList] = useState<AdminReport[]>([])
  const [banList, setBanList] = useState<Ban[]>([])

  useEffect(() => {
    api<Stats>("/api/admin/stats").then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === "users") api<User[]>("/api/admin/users").then(setUserList).catch(() => {})
    if (tab === "reports") api<AdminReport[]>("/api/admin/reports").then(setReportList).catch(() => {})
    if (tab === "bans") api<Ban[]>("/api/admin/bans").then(setBanList).catch(() => {})
  }, [tab])

  const resolveReport = async (id: string, status: string) => {
    await api(`/api/admin/reports/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }).catch(() => {})
    setReportList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  const deleteUser = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return
    await api(`/api/admin/users/${id}`, { method: "DELETE" }).catch(() => {})
    setUserList((prev) => prev.filter((u) => u.id !== id))
  }

  const removeBan = async (id: string) => {
    await api(`/api/admin/bans/${id}`, { method: "DELETE" }).catch(() => {})
    setBanList((prev) => prev.filter((b) => b.id !== id))
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: t("admin.overview"), icon: Shield },
    { key: "users", label: t("admin.users"), icon: Users },
    { key: "reports", label: t("admin.reports"), icon: AlertTriangle },
    { key: "bans", label: t("admin.bans"), icon: Ban },
  ]

  return (
    <div className="flex h-full">
      <div className="w-56 border-r border-border flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" /> {t("admin.title")}
          </h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all cursor-pointer text-left ${
                tab === t.key ? "bg-accent/10 text-accent" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-4">{t("admin.overview")}</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stats && (
                <>
                  <StatCard icon={Users} label={t("admin.users")} value={stats.users} />
                  <StatCard icon={MessageSquare} label={t("admin.conversations")} value={stats.conversations} />
                  <StatCard icon={FileText} label={t("admin.messages")} value={stats.messages} />
                  <StatCard icon={AlertTriangle} label={t("admin.reports")} value={stats.reports} />
                  <StatCard icon={Ban} label={t("admin.bans")} value={stats.bans} />
                </>
              )}
              {!stats && <p className="text-sm text-text-muted col-span-full">{t("admin.loadingStats")}</p>}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-4">{t("admin.users")} ({userList.length})</h1>
            <div className="space-y-2">
              {userList.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                    {(u.displayName || u.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                    <p className="text-xs text-text-muted">@{u.username} · {u.email}</p>
                  </div>
                  <span className="text-xs text-text-muted capitalize">{u.status}</span>
                  <span className="text-xs text-text-muted">{new Date(u.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="text-text-muted hover:text-danger cursor-pointer"
                    title={t("admin.deleteUser")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "reports" && (
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-4">{t("admin.reports")} ({reportList.length})</h1>
            <div className="space-y-2">
              {reportList.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{r.reason}</p>
                      <p className="text-xs text-text-muted mt-1">
                        Reported by: {r.reportedBy.slice(0, 8)}...
                        {r.targetUserId && ` · Target: ${r.targetUserId.slice(0, 8)}...`}
                        {r.targetMessageId && ` · Message: ${r.targetMessageId.slice(0, 8)}...`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs capitalize px-2.5 py-1 rounded-xl ${
                        r.status === "open" ? "bg-yellow-500/10 text-yellow-400" :
                        r.status === "resolved" ? "bg-green-500/10 text-green-400" :
                        "bg-text-muted/10 text-text-muted"
                      }`}>
                        {r.status}
                      </span>
                      {r.status === "open" && (
                        <>
                          <button onClick={() => resolveReport(r.id, "resolved")} className="text-xs text-accent hover:text-accent-hover cursor-pointer">{t("admin.resolve")}</button>
                          <button onClick={() => resolveReport(r.id, "dismissed")} className="text-xs text-text-muted hover:text-text-primary cursor-pointer">{t("admin.dismiss")}</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {reportList.length === 0 && <p className="text-sm text-text-muted text-center py-4">{t("admin.noReports")}</p>}
            </div>
          </div>
        )}

        {tab === "bans" && (
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-4">{t("admin.bans")} ({banList.length})</h1>
            <div className="space-y-2">
              {banList.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <Ban className="h-4 w-4 text-danger shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{t("admin.userLabel")}: {b.userId.slice(0, 8)}...</p>
                    <p className="text-xs text-text-muted">
                      {b.reason ? `${t("admin.reason")}: ${b.reason} · ` : ""}
                      {t("admin.banned")}: {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeBan(b.id)}
                    className="text-xs text-accent hover:text-accent-hover cursor-pointer"
                  >
                    {t("admin.unban")}
                  </button>
                </div>
              ))}
              {banList.length === 0 && <p className="text-sm text-text-muted text-center py-4">{t("admin.noBans")}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  )
}
