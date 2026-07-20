import { useState } from "react"
import { ConversationList } from "./conversation-list"
import { ChatArea } from "./chat-area"
import { useAuth } from "../../lib/auth-context"

export function ChatWindow() {
  const { user } = useAuth()
  const [activeConv, setActiveConv] = useState<string | null>(null)

  return (
    <div className="flex h-full rounded-[32px] overflow-hidden border border-border">
      <div className="w-80 shrink-0 border-r border-border bg-bg-secondary">
        <ConversationList activeId={activeConv} onSelect={setActiveConv} />
      </div>
      <div className="flex-1 bg-surface">
        {activeConv && user ? (
          <ChatArea conversationId={activeConv} currentUserId={user.id} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
