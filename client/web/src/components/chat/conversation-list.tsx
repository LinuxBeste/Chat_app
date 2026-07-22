import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Avatar } from "../ui/avatar"
import { api } from "../../lib/api"
import { Plus, Search, X, MessageSquare, UserPlus, Loader2 } from "lucide-react"

interface Conversation {
  id: string
  type: "dm" | "group" | "channel"
  name: string | null
  createdAt: string
}

interface ConversationListProps {
  activeId: string | null
  onSelect: (id: string) => void
}

interface UserResult {
  id: string
  username: string
  displayName: string | null
  avatar: string | null
  status: string
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { t } = useTranslation()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [showNewConv, setShowNewConv] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api<Conversation[]>("/api/conversations")
      .then(setConvs)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      api<UserResult[]>(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const createConversation = async (userId: string) => {
    setCreating(true)
    try {
      const conv = await api<Conversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: [userId] }),
      })
      setConvs((prev) => [conv, ...prev])
      onSelect(conv.id)
      setShowNewConv(false)
      setSearchQuery("")
    } catch {}
    setCreating(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{t("chat.conversations")}</h2>
          <p className="text-xs text-text-muted mt-0.5">{convs.length} {t("chat.total")}</p>
        </div>
        <button
          onClick={() => setShowNewConv(true)}
          aria-label={t("chat.newConversation")}
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" role="listbox" aria-label={t("chat.conversations")}>
        {convs.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            role="option"
            aria-selected={activeId === conv.id}
            aria-label={`${t("chat.openConversation")} ${conv.name ?? conv.type}`}
            className={`flex w-full items-start gap-3 px-4 py-3.5 transition-all duration-200 cursor-pointer text-left border-b border-border last:border-0 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${activeId === conv.id ? "bg-accent/[0.03]" : ""}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <Avatar fallback={conv.name?.[0] ?? "?"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">{conv.name ?? conv.type}</span>
              </div>
              <p className="text-sm text-text-secondary truncate mt-0.5">{t(`chat.${conv.type}Conversation`)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40" onClick={() => setShowNewConv(false)}>
          <div
            className="w-full max-w-md rounded-[32px] border border-border bg-surface shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                {t("chat.newConversation")}
              </h3>
              <button onClick={() => setShowNewConv(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mx-5 mb-3 px-4 py-2.5 rounded-2xl border border-border bg-bg-primary">
              <Search className="h-4 w-4 text-text-muted shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("chat.searchUsers")}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto px-5 pb-4 space-y-1">
              {searchQuery.length >= 1 && searchResults.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">{t("chat.noUsersFound")}</p>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => createConversation(u.id)}
                  disabled={creating}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer text-left disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0 overflow-hidden">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (u.displayName || u.username)[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                    <p className="text-xs text-text-muted">@{u.username}</p>
                  </div>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    u.status === "online" ? "bg-green-500" :
                    u.status === "away" ? "bg-yellow-500" :
                    u.status === "busy" ? "bg-red-500" : "bg-text-muted"
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
