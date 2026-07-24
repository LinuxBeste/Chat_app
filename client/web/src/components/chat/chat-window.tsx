import { ConversationList } from "./conversation-list"
import { useTranslation } from "react-i18next"
import { ChatArea } from "./chat-area"
import { useAuth } from "../../lib/auth-context"

interface ChatWindowProps {
  activeConversationId: string | null
  onConversationChange: (id: string | null) => void
}

export function ChatWindow({ activeConversationId, onConversationChange }: ChatWindowProps) {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r border-border overflow-hidden">
        <ConversationList activeId={activeConversationId} onSelect={onConversationChange} />
      </div>
      <div className="flex-1 min-w-0">
        {activeConversationId ? (
          <ChatArea key={activeConversationId} conversationId={activeConversationId} currentUserId={user.id} onLeave={() => onConversationChange(null)} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            {t("chat.selectConversation")}
          </div>
        )}
      </div>
    </div>
  )
}
