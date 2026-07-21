import { Avatar } from "./ui/avatar"
import { cn } from "../lib/utils"

const contacts = [
  { name: "Sarah Chen", status: "online", statusText: "Active" },
  { name: "Alex Rivera", status: "online", statusText: "Active" },
  { name: "Maya Patel", status: "away", statusText: "Away" },
  { name: "James Wilson", status: "busy", statusText: "In a meeting" },
  { name: "Emma Thompson", status: "online", statusText: "Active" },
  { name: "Liam O'Brien", status: "offline", statusText: "Offline" },
]

const statusColors = {
  online: "bg-online",
  away: "bg-away",
  busy: "bg-busy",
  offline: "bg-text-muted",
}

export function ContactsPanel() {
  return (
    <div>
      {contacts.map((contact, i) => (
        <button
          key={i}
          className="flex w-full items-center gap-3 px-1 py-2.5 transition-all duration-200 hover:bg-white/[0.02] cursor-pointer text-left rounded-2xl"
        >
          <div className="relative shrink-0">
            <Avatar
              size="sm"
              fallback={contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface",
                statusColors[contact.status as keyof typeof statusColors],
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{contact.name}</p>
            <p className="text-xs text-text-muted">{contact.statusText}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
