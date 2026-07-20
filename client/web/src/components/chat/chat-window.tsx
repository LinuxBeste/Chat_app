import { ConversationList } from "./conversation-list"
import { ChatArea } from "./chat-area"

export function ChatWindow() {
  return (
    <div className="flex h-full rounded-[32px] overflow-hidden border border-border">
      <div className="w-80 shrink-0 border-r border-border bg-bg-secondary">
        <ConversationList />
      </div>
      <div className="flex-1 bg-surface">
        <ChatArea />
      </div>
    </div>
  )
}
