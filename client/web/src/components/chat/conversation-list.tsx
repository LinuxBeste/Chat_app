import { useState, useEffect } from "react"
import { Avatar } from "../ui/avatar"
import { api } from "../../lib/api"

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

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const [convs, setConvs] = useState<Conversation[]>([])

  useEffect(() => {
    api<Conversation[]>("/api/conversations").then(setConvs).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Conversations</h2>
        <p className="text-xs text-text-muted mt-0.5">{convs.length} total</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {convs.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`flex w-full items-start gap-3 px-4 py-3.5 transition-all duration-200 cursor-pointer text-left border-b border-border last:border-0 hover:bg-white/[0.02] ${activeId === conv.id ? "bg-accent/[0.03]" : ""}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <Avatar fallback={conv.name?.[0] ?? "?"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {conv.name ?? conv.type}
                </span>
              </div>
              <p className="text-sm text-text-secondary truncate mt-0.5">
                {conv.type} conversation
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
