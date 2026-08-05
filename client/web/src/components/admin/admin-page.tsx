import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import {
  Shield,
  Users,
  MessageSquare,
  FileText,
  AlertTriangle,
  Ban,
  Trash2,
  Star,
  UserPlus,
  UserX,
  Search,
  X,
  Eye,
  Activity,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Stats {
  users: number;
  conversations: number;
  messages: number;
  reports: number;
  bans: number;
  registrationsToday: number;
  onlineUsers: number;
  messagesToday: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  status: string;
  avatar?: string | null;
  createdAt: string;
}

interface AdminReport {
  id: string;
  reportedBy: string;
  targetUserId: string | null;
  targetMessageId: string | null;
  reason: string;
  status: string;
  createdAt: string;
  reportedByName?: string;
  targetUserName?: string | null;
}

interface AdminBan {
  id: string;
  conversationId: string;
  userId: string;
  bannedBy: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

type Tab = "overview" | "users" | "reports" | "bans" | "admins" | "activity";

export function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userQuery, setUserQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [reportList, setReportList] = useState<AdminReport[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [banList, setBanList] = useState<AdminBan[]>([]);
  const [banTotal, setBanTotal] = useState(0);
  const [banPage, setBanPage] = useState(1);
  const [banQuery, setBanQuery] = useState("");
  const [activityList, setActivityList] = useState<ActivityItem[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [addAdminId, setAddAdminId] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [detailUser, setDetailUser] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api<Stats>("/api/admin/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers();
    if (tab === "reports") loadReports();
    if (tab === "bans") loadBans();
    if (tab === "activity") loadActivity();
    if (tab === "admins") loadAdmins();
  }, [tab, userPage, reportPage, banPage]);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (userQuery) params.set("q", userQuery);
    if (userStatusFilter) params.set("status", userStatusFilter);
    params.set("page", String(userPage));
    const data = await api<any>(`/api/admin/users?${params}`).catch(() => null);
    if (data) {
      setUserList(data.users);
      setUserTotal(data.total);
    }
  }, [userQuery, userStatusFilter, userPage]);

  const loadReports = useCallback(async () => {
    const params = new URLSearchParams();
    if (reportStatusFilter) params.set("status", reportStatusFilter);
    params.set("page", String(reportPage));
    const data = await api<any>(`/api/admin/reports?${params}`).catch(() => null);
    if (data) {
      setReportList(data.reports);
      setReportTotal(data.total);
    }
  }, [reportStatusFilter, reportPage]);

  const loadBans = useCallback(async () => {
    const params = new URLSearchParams();
    if (banQuery) params.set("q", banQuery);
    params.set("page", String(banPage));
    const data = await api<any>(`/api/admin/bans?${params}`).catch(() => null);
    if (data) {
      setBanList(data.bans);
      setBanTotal(data.total);
    }
  }, [banQuery, banPage]);

  const loadActivity = useCallback(async () => {
    const data = await api<ActivityItem[]>("/api/admin/activity").catch(() => []);
    setActivityList(data);
  }, []);

  const loadAdmins = useCallback(async () => {
    const data = await api<{ ownerId: string | null; adminIds: string[] }>("/api/admin/admins").catch(() => null);
    if (data) {
      setOwnerId(data.ownerId);
      setAdminIds(data.adminIds);
    }
  }, []);

  const searchUsers = () => {
    setUserPage(1);
    loadUsers();
  };

  const resolveReport = async (id: string, status: string) => {
    await api(`/api/admin/reports/${id}`, { method: "PUT", body: JSON.stringify({ status }) }).catch(() => {});
    setReportList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const deleteUser = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return;
    await api(`/api/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
    setUserList((prev) => prev.filter((u) => u.id !== id));
    setUserTotal((p) => p - 1);
  };

  const toggleSuspend = async (id: string, currentlySuspended: boolean) => {
    await api(`/api/admin/users/${id}/suspend`, {
      method: "PUT",
      body: JSON.stringify({ suspended: !currentlySuspended }),
    }).catch(() => {});
    setUserList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: currentlySuspended ? "offline" : "busy" } : u)),
    );
  };

  const viewUserDetail = async (id: string) => {
    setDetailLoading(true);
    const data = await api<any>(`/api/admin/users/${id}`).catch(() => null);
    setDetailUser(data);
    setDetailLoading(false);
  };

  const removeBan = async (id: string) => {
    await api(`/api/admin/bans/${id}`, { method: "DELETE" }).catch(() => {});
    setBanList((prev) => prev.filter((b) => b.id !== id));
    setBanTotal((p) => p - 1);
  };

  const addAdmin = async () => {
    if (!addAdminId.trim()) return;
    setAdminMsg("");
    try {
      const res = await api<{ adminIds: string[] }>("/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ userId: addAdminId.trim() }),
      });
      setAdminIds(res.adminIds);
      setAddAdminId("");
      setAdminMsg(t("admin.adminAdded"));
    } catch {
      setAdminMsg(t("admin.failed"));
    }
  };

  const removeAdmin = async (userId: string) => {
    if (!confirm(t("admin.removeAdminConfirm"))) return;
    setAdminMsg("");
    try {
      const res = await api<{ adminIds: string[] }>(`/api/admin/admins/${userId}`, { method: "DELETE" });
      setAdminIds(res.adminIds);
      setAdminMsg(t("admin.adminRemoved"));
    } catch {
      setAdminMsg(t("admin.failed"));
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: t("admin.overview"), icon: Shield },
    { key: "users", label: t("admin.users"), icon: Users },
    { key: "reports", label: t("admin.reports"), icon: AlertTriangle },
    { key: "bans", label: t("admin.bans"), icon: Ban },
    { key: "activity", label: t("admin.activity"), icon: Activity },
    { key: "admins", label: t("admin.admins"), icon: Star },
  ];

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
                tab === t.key
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
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
            {stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    icon={Users}
                    label={t("admin.users")}
                    value={stats.users}
                    sub={t("admin.onlineUsers") + ": " + stats.onlineUsers}
                  />
                  <StatCard
                    icon={MessageSquare}
                    label={t("admin.messages")}
                    value={stats.messages}
                    sub={t("admin.today") + ": " + stats.messagesToday}
                  />
                  <StatCard icon={FileText} label={t("admin.conversations")} value={stats.conversations} />
                  <StatCard
                    icon={AlertTriangle}
                    label={t("admin.reports")}
                    value={stats.reports}
                    sub={t("admin.open") + ": " + stats.reports}
                  />
                  <StatCard icon={Ban} label={t("admin.bans")} value={stats.bans} />
                  <StatCard icon={Users} label={t("admin.registrationsToday")} value={stats.registrationsToday} />
                  <StatCard icon={Activity} label={t("admin.onlineUsers")} value={stats.onlineUsers} />
                  <StatCard icon={Clock} label={t("admin.messagesToday")} value={stats.messagesToday} />
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">{t("admin.loadingStats")}</p>
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-text-primary">
                {t("admin.users")} ({userTotal})
              </h1>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  placeholder={t("admin.searchUsers")}
                  className="w-full h-9 pl-9 pr-3 rounded-2xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                />
              </div>
              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                className="h-9 rounded-2xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent/50"
              >
                <option value="">{t("admin.allStatuses")}</option>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
              <button
                onClick={searchUsers}
                className="h-9 px-4 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer"
              >
                {t("common.search")}
              </button>
            </div>
            <div className="space-y-2">
              {userList.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                    {(u.displayName || u.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                    <p className="text-xs text-text-muted">
                      @{u.username} · {u.email}
                    </p>
                  </div>
                  <span
                    className={`text-xs capitalize px-2.5 py-1 rounded-xl ${
                      u.status === "online"
                        ? "bg-green-500/10 text-green-400"
                        : u.status === "away"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : u.status === "busy"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-text-muted/10 text-text-muted"
                    }`}
                  >
                    {u.status}
                  </span>
                  <button
                    onClick={() => viewUserDetail(u.id)}
                    className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 cursor-pointer"
                    title={t("admin.viewDetails")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSuspend(u.id, u.status === "busy")}
                    className={`p-1.5 rounded-xl cursor-pointer ${u.status === "busy" ? "text-green-500 hover:text-green-400" : "text-text-muted hover:text-yellow-400"}`}
                    title={u.status === "busy" ? t("admin.unsuspend") : t("admin.suspend")}
                  >
                    {u.status === "busy" ? <Check className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="p-1.5 rounded-xl text-text-muted hover:text-danger cursor-pointer"
                    title={t("admin.deleteUser")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {userList.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">{t("common.noResults")}</p>
              )}
            </div>
            {userTotal > 50 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => p - 1)}
                  className="flex items-center gap-1 h-8 px-3 rounded-xl border border-border text-sm text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> {t("common.prev")}
                </button>
                <span className="text-xs text-text-muted">
                  {userPage} / {Math.ceil(userTotal / 50)}
                </span>
                <button
                  disabled={userPage >= Math.ceil(userTotal / 50)}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="flex items-center gap-1 h-8 px-3 rounded-xl border border-border text-sm text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  {t("common.next")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "reports" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-text-primary">
                {t("admin.reports")} ({reportTotal})
              </h1>
              <select
                value={reportStatusFilter}
                onChange={(e) => {
                  setReportStatusFilter(e.target.value);
                  setReportPage(1);
                }}
                className="h-9 rounded-2xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent/50"
              >
                <option value="">{t("admin.allStatuses")}</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div className="space-y-2">
              {reportList.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{r.reason}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {t("admin.reportBy")}: {r.reportedByName || r.reportedBy.slice(0, 8)}...
                        {r.targetUserName && ` · ${t("admin.target")}: ${r.targetUserName}`}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span
                        className={`text-xs capitalize px-2.5 py-1 rounded-xl ${
                          r.status === "open"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : r.status === "resolved"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-text-muted/10 text-text-muted"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.status === "open" && (
                        <>
                          <button
                            onClick={() => resolveReport(r.id, "resolved")}
                            className="text-xs text-accent hover:text-accent-hover cursor-pointer"
                          >
                            {t("admin.resolve")}
                          </button>
                          <button
                            onClick={() => resolveReport(r.id, "dismissed")}
                            className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
                          >
                            {t("admin.dismiss")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {reportList.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">{t("admin.noReports")}</p>
              )}
            </div>
            {reportTotal > 50 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  disabled={reportPage <= 1}
                  onClick={() => setReportPage((p) => p - 1)}
                  className="flex items-center gap-1 h-8 px-3 rounded-xl border border-border text-sm text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> {t("common.prev")}
                </button>
                <span className="text-xs text-text-muted">
                  {reportPage} / {Math.ceil(reportTotal / 50)}
                </span>
                <button
                  disabled={reportPage >= Math.ceil(reportTotal / 50)}
                  onClick={() => setReportPage((p) => p + 1)}
                  className="flex items-center gap-1 h-8 px-3 rounded-xl border border-border text-sm text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  {t("common.next")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "bans" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-text-primary">
                {t("admin.bans")} ({banTotal})
              </h1>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  value={banQuery}
                  onChange={(e) => setBanQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadBans()}
                  placeholder={t("admin.searchBans")}
                  className="w-full h-9 pl-9 pr-3 rounded-2xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              {banList.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <Ban className="h-4 w-4 text-danger shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">ID: {b.userId.slice(0, 12)}...</p>
                    <p className="text-xs text-text-muted">
                      {b.reason ? `${t("admin.reason")}: ${b.reason} · ` : ""}
                      {t("admin.banned")}: {new Date(b.createdAt).toLocaleDateString()}
                      {b.expiresAt ? ` · ${t("admin.expires")}: ${new Date(b.expiresAt).toLocaleDateString()}` : ""}
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
            {banTotal > 50 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  disabled={banPage <= 1}
                  onClick={() => setBanPage((p) => p - 1)}
                  className="flex items-center gap-1 h-8 px-3 rounded-xl border border-border text-sm text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> {t("common.prev")}
                </button>
                <span className="text-xs text-text-muted">
                  {banPage} / {Math.ceil(banTotal / 50)}
                </span>
                <button
                  disabled={banPage >= Math.ceil(banTotal / 50)}
                  onClick={() => setBanPage((p) => p + 1)}
                  className="flex items-center gap-1 h-8 px-3 rounded-xl border border-border text-sm text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  {t("common.next")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-4">{t("admin.activity")}</h1>
            <div className="space-y-1.5">
              {activityList.map((a) => (
                <div
                  key={a.id + a.type}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5"
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                      a.type === "message"
                        ? "bg-accent/10 text-accent"
                        : a.type === "report"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-danger/10 text-danger"
                    }`}
                  >
                    {a.type === "message" ? (
                      <MessageSquare className="h-3.5 w-3.5" />
                    ) : a.type === "report" ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Ban className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">
                      <span className="font-medium">{a.username}</span>
                      {a.type === "message" ? ` sent a message` : a.type === "report" ? ` reported` : ` banned`}
                    </p>
                    <p className="text-xs text-text-muted truncate">{a.content}</p>
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {activityList.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">{t("common.noResults")}</p>
              )}
            </div>
          </div>
        )}

        {tab === "admins" && (
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-4">{t("admin.adminManagement")}</h1>

            <div className="rounded-2xl border border-border bg-surface p-4 mb-4">
              <p className="text-sm text-text-muted mb-2">{t("admin.owner")}:</p>
              <p className="text-sm text-text-primary font-mono">
                {ownerId ? `${ownerId.slice(0, 8)}...` : t("admin.notSet")}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-text-primary">
                {t("admin.currentAdmins")} ({adminIds.length})
              </p>
              {adminIds.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                      {id.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-text-primary font-mono">{id.slice(0, 8)}...</span>
                  </div>
                  <button
                    onClick={() => removeAdmin(id)}
                    className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 cursor-pointer"
                  >
                    <UserX className="h-3.5 w-3.5" /> {t("admin.remove")}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" /> {t("admin.addAdmin")}
              </p>
              <div className="flex gap-2">
                <input
                  value={addAdminId}
                  onChange={(e) => setAddAdminId(e.target.value)}
                  placeholder={t("admin.userIdPlaceholder")}
                  className="flex-1 h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                />
                <button
                  onClick={addAdmin}
                  disabled={!addAdminId.trim()}
                  className="h-10 px-4 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                >
                  {t("admin.add")}
                </button>
              </div>
              {adminMsg && <p className="text-xs text-text-muted mt-2">{adminMsg}</p>}
            </div>
          </div>
        )}
      </div>

      {detailUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDetailUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-[32px] border border-border bg-surface p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">{t("admin.userDetails")}</h3>
              <button
                onClick={() => setDetailUser(null)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {detailLoading ? (
              <p className="text-sm text-text-muted">{t("common.loading")}</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold">
                    {(detailUser.displayName || detailUser.username)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {detailUser.displayName || detailUser.username}
                    </p>
                    <p className="text-xs text-text-muted">
                      @{detailUser.username} · {detailUser.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-bg-primary px-3 py-2">
                    <p className="text-xs text-text-muted">{t("admin.messages")}</p>
                    <p className="text-lg font-bold text-text-primary">{detailUser.messageCount}</p>
                  </div>
                  <div className="rounded-2xl bg-bg-primary px-3 py-2">
                    <p className="text-xs text-text-muted">{t("admin.conversations")}</p>
                    <p className="text-lg font-bold text-text-primary">{detailUser.conversationCount}</p>
                  </div>
                  <div className="rounded-2xl bg-bg-primary px-3 py-2">
                    <p className="text-xs text-text-muted">{t("admin.status")}</p>
                    <p className="text-sm font-medium text-text-primary capitalize">{detailUser.status}</p>
                  </div>
                  <div className="rounded-2xl bg-bg-primary px-3 py-2">
                    <p className="text-xs text-text-muted">{t("admin.role")}</p>
                    <p className="text-sm font-medium text-text-primary">
                      {detailUser.isAdmin ? t("admin.admin") : t("admin.member")}
                    </p>
                  </div>
                </div>
                {detailUser.createdAt && (
                  <p className="text-xs text-text-muted">
                    {t("admin.memberSince")}: {new Date(detailUser.createdAt).toLocaleDateString()}
                  </p>
                )}
                {detailUser.bans?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-primary mb-1">{t("admin.bans")}:</p>
                    {detailUser.bans.map((b: any) => (
                      <div key={b.id} className="text-xs text-text-muted flex items-center gap-2">
                        <Ban className="h-3 w-3 text-danger" />
                        {b.reason || "No reason"} · {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}
