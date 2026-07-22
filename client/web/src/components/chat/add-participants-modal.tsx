import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { api } from "../../lib/api"
import { Search, X, Plus, UserCheck } from "lucide-react"

interface UserResult {
  id: string
  username: string
  displayName: string | null
  avatar: string | null
}

interface AddParticipantsModalProps {
  conversationId: string
  onClose: () => void
  onAdded: () => void
}

export function AddParticipantsModal({ conversationId, onClose, onAdded }: AddParticipantsModalProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      api<UserResult[]>(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addParticipants = async () => {
    if (selected.size === 0 || adding) return
    setAdding(true)
    try {
      await api(`/api/conversations/${conversationId}/participants`, {
        method: "POST",
        body: JSON.stringify({ participantIds: Array.from(selected) }),
      })
      onAdded()
      onClose()
    } catch {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[32px] border border-border bg-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-text-primary">{t("chat.addPeopleTitle")}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mx-5 mb-3 px-4 py-2.5 rounded-2xl border border-border bg-bg-primary">
          <Search className="h-4 w-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("chat.searchUsers")}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        <div className="max-h-60 overflow-y-auto px-5 pb-3 space-y-1">
          {query.length >= 1 && results.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">{t("chat.noUsersFound")}</p>
          )}
          {results.map((u) => {
            const isSelected = selected.has(u.id)
            return (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-2xl transition-all cursor-pointer text-left ${
                  isSelected ? "bg-accent/10" : "hover:bg-white/5"
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                  {(u.displayName || u.username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                  <p className="text-xs text-text-muted">@{u.username}</p>
                </div>
                {isSelected ? (
                  <UserCheck className="h-4 w-4 text-accent shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-text-muted shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={addParticipants}
            disabled={selected.size === 0 || adding}
            className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
          >
            {adding ? t("chat.adding") : `${t("common.add")} ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  )
}
