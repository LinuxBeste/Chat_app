import { Avatar } from "../ui/avatar"
import { Badge } from "../ui/badge"

const conversations = [
  {
    name: "Sarah Chen",
    avatar: "SC",
    lastMsg: "Sounds great! Let me check the design files and get back to you.",
    time: "2m",
    unread: 2,
    online: true,
  },
  {
    name: "Alex Rivera",
    avatar: "AR",
    lastMsg: "The deployment is complete. Everything looks good on staging.",
    time: "15m",
    unread: 0,
    online: true,
  },
  {
    name: "Maya Patel",
    avatar: "MP",
    lastMsg: "Sure, I'll send over the updated wireframes by EOD.",
    time: "1h",
    unread: 1,
    online: false,
  },
  {
    name: "James Wilson",
    avatar: "JW",
    lastMsg: "Can we schedule a quick sync before the sprint review?",
    time: "2h",
    unread: 0,
    online: true,
  },
  {
    name: "Emma Thompson",
    avatar: "ET",
    lastMsg: "Thanks for the feedback! I'll incorporate it in the next iteration.",
    time: "3h",
    unread: 0,
    online: false,
  },
  {
    name: "Liam O'Brien",
    avatar: "LO",
    lastMsg: "The API changes are live. Let me know if you see any issues.",
    time: "5h",
    unread: 0,
    online: true,
  },
]

export function ConversationList() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Conversations</h2>
        <p className="text-xs text-text-muted mt-0.5">6 total</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv, i) => (
          <button
            key={i}
            className={`flex w-full items-start gap-3 px-4 py-3.5 transition-all duration-200 cursor-pointer text-left border-b border-border last:border-0 hover:bg-white/[0.02] ${i === 0 ? "bg-accent/[0.03]" : ""}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <Avatar fallback={conv.avatar} />
              {conv.online && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-online" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">{conv.name}</span>
                <span className="text-xs text-text-muted shrink-0">{conv.time}</span>
              </div>
              <p className="text-sm text-text-secondary truncate mt-0.5">{conv.lastMsg}</p>
            </div>
            {conv.unread > 0 && (
              <Badge variant="default" className="shrink-0 mt-1">{conv.unread}</Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
