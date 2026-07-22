import { useState } from "react"
import { ConversationList } from "./conversation-list"
import { useTranslation } from "react-i18next"
import { ChatArea } from "./chat-area"

interface ChatWindowProps {
  conversationId: string | null
  currentUserId: string
}

export function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const { t } = useTranslation()
  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        {t("chat.selectConversation")}
      </div>
    )
  }
  return <ChatArea key={conversationId} conversationId={conversationId} currentUserId={currentUserId} />
}
