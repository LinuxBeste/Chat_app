import { Avatar } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { MoreHorizontal } from "lucide-react"

const messages = [
  {
    name: "Sarah Chen",
    avatar: "SC",
    message: "Sounds great! Let me check the design files and get back to you.",
    time: "2m ago",
    unread: 2,
    online: true,
  },
  {
    name: "Alex Rivera",
    avatar: "AR",
    message: "The deployment is complete. Everything looks good on staging.",
    time: "15m ago",
    unread: 0,
    online: true,
  },
  {
    name: "Maya Patel",
    avatar: "MP",
    message: "Sure, I'll send over the updated wireframes by EOD.",
    time: "1h ago",
    unread: 1,
    online: false,
  },
  {
    name: "James Wilson",
    avatar: "JW",
    message: "Can we schedule a quick sync before the sprint review?",
    time: "2h ago",
    unread: 0,
    online: true,
  },
  {
    name: "Emma Thompson",
    avatar: "ET",
    message: "Thanks for the feedback! I'll incorporate it in the next iteration.",
    time: "3h ago",
    unread: 0,
    online: false,
  },
]

export function MessageList() {
  return (
    <div>
      {messages.map((msg, i) => (
        <button
          key={i}
          className="flex w-full items-center gap-3 px-1 py-3.5 border-b border-border last:border-0 transition-all duration-200 hover:bg-white/[0.02] cursor-pointer text-left group"
        >
          <div className="relative shrink-0">
            <Avatar fallback={msg.avatar} />
            {msg.online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-online" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{msg.name}</span>
              <span className="text-xs text-text-muted shrink-0">{msg.time}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-sm text-text-secondary truncate">{msg.message}</span>
              {msg.unread > 0 && (
                <Badge variant="default" className="ml-2 shrink-0">
                  {msg.unread}
                </Badge>
              )}
            </div>
          </div>

          <MoreHorizontal className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
        </button>
      ))}
    </div>
  )
}
