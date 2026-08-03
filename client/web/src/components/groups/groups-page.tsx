import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { api, resolveAssetUrl } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { ChatArea } from "../chat/chat-area"
import { Plus, Users, X, Search, UserPlus, Trash2, MessageSquare } from "lucide-react"

interface Group {
  id: string
  type: string
  name: string | null
  avatar: string | null
  createdAt: string
  createdBy: string
}

interface UserResult {
  id: string
  username: string
  displayName: string | null
}

export function GroupsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createSearchQuery, setCreateSearchQuery] = useState("")
  const [createSearchResults, setCreateSearchResults] = useState<UserResult[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())

  useEffect(() => {
    api<Group[]>("/api/conversations")
      .then((convs) => {
        setGroups(convs.filter((c) => c.type === "group"))
      })
      .catch(() => {})
  }, [])

  const deleteGroup = async (id: string) => {
    try {
      await api(`/api/conversations/${id}`, { method: "DELETE" })
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedGroupId === id) setSelectedGroupId(null)
    } catch {
      /* ignore */
    }
  }

  const createGroup = async () => {
    if (!createName.trim()) return
    const conv = await api<Group>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({
        type: "group",
        name: createName.trim(),
        participantIds: Array.from(selectedParticipants),
      }),
    }).catch(() => null)
    if (conv) {
      setGroups((prev) => [conv, ...prev.filter((g) => g.id !== conv.id)])
      setSelectedGroupId(conv.id)
      setCreateName("")
      setCreateSearchQuery("")
      setCreateSearchResults([])
      setSelectedParticipants(new Set())
      setShowCreate(false)
    }
  }

  useEffect(() => {
    if (!createSearchQuery || createSearchQuery.length < 1) {
      setCreateSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      api<UserResult[]>(`/api/users/search?q=${encodeURIComponent(createSearchQuery)}`)
        .then(setCreateSearchResults)
        .catch(() => setCreateSearchResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [createSearchQuery])

  return (
    <div className="flex h-full">
      <div
        className={`flex flex-col border-r border-border ${selectedGroupId ? "w-72 shrink-0 hidden md:flex" : "flex-1"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{t("groups.title")}</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
            aria-label={t("groups.createGroup")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 && <p className="text-sm text-text-muted text-center py-8">{t("groups.noGroups")}</p>}
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer hover:bg-white/[0.02] ${
                selectedGroupId === g.id ? "bg-white/[0.03]" : ""
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0 overflow-hidden">
                {g.avatar ? (
                  <img src={resolveAssetUrl(g.avatar)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{g.name ?? t("groups.unnamed")}</p>
                <p className="text-xs text-text-muted">Group</p>
              </div>
              {g.createdBy === user?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteGroup(g.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-danger/10 transition-all cursor-pointer shrink-0"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <MessageSquare className="h-4 w-4 text-text-muted shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <div className={`flex flex-col ${selectedGroupId ? "flex-1" : "hidden md:flex md:flex-1"}`}>
        {selectedGroupId && user ? (
          <ChatArea conversationId={selectedGroupId} currentUserId={user.id} onLeave={() => setSelectedGroupId(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-muted">{t("groups.selectGroup")}</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setShowCreate(false)
            setCreateSearchQuery("")
            setCreateSearchResults([])
            setSelectedParticipants(new Set())
          }}
        >
          <div
            className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">{t("groups.createGroup")}</h3>
              <button
                onClick={() => {
                  setShowCreate(false)
                  setCreateSearchQuery("")
                  setCreateSearchResults([])
                  setSelectedParticipants(new Set())
                }}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("groups.groupNamePlaceholder")}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 mb-3"
            />
            <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-2xl border border-border bg-bg-primary">
              <Search className="h-4 w-4 text-text-muted shrink-0" />
              <input
                value={createSearchQuery}
                onChange={(e) => setCreateSearchQuery(e.target.value)}
                placeholder={t("groups.searchUsers")}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>
            {selectedParticipants.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Array.from(selectedParticipants).map((id) => {
                  const u = createSearchResults.find((r) => r.id === id)
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent/10 text-accent text-xs"
                    >
                      {u?.displayName || u?.username || id.slice(0, 8)}
                      <button
                        onClick={() =>
                          setSelectedParticipants((prev) => {
                            const next = new Set(prev)
                            next.delete(id)
                            return next
                          })
                        }
                        className="hover:text-accent-hover cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
              {createSearchQuery.length >= 1 && createSearchResults.length === 0 && (
                <p className="text-sm text-text-muted text-center py-2">{t("groups.noUsersFound")}</p>
              )}
              {createSearchResults
                .filter((u) => !selectedParticipants.has(u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedParticipants((prev) => new Set(prev).add(u.id))}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                      {(u.displayName || u.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                      <p className="text-xs text-text-muted">@{u.username}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-text-muted shrink-0" />
                  </button>
                ))}
            </div>
            <button
              onClick={createGroup}
              disabled={!createName.trim()}
              className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
            >
              {t("common.create")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
