import { MessageInput } from "./message-input"
import { Avatar } from "../ui/avatar"
import { Phone, Video, MoreHorizontal } from "lucide-react"

const messages = [
  { from: "them", text: "Hey! Have you had a chance to look at the designs?", time: "10:24 AM" },
  { from: "me", text: "Yes, just finished reviewing them. The new layout looks great!", time: "10:26 AM" },
  { from: "them", text: "Thanks! Did you have any feedback on the color scheme?", time: "10:27 AM" },
  { from: "me", text: "I think the dark mode palette works well. Maybe we could try a slightly warmer accent color?", time: "10:29 AM" },
  { from: "them", text: "That makes sense. I'll put together a few variations and share them with you.", time: "10:31 AM" },
  { from: "me", text: "Sounds great! Let me check the design files and get back to you.", time: "10:32 AM" },
  { from: "them", text: "Perfect, no rush. Also, the client loved the prototype we showed last week!", time: "10:34 AM" },
]

export function ChatArea() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="relative">
          <Avatar fallback="SC" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-online" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">Sarah Chen</h3>
          <p className="text-xs text-text-muted">Online</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer">
            <Phone className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer">
            <Video className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] rounded-3xl px-4 py-2.5 ${
                msg.from === "me"
                  ? "bg-accent text-white rounded-br-lg"
                  : "bg-surface text-text-primary border border-border rounded-bl-lg"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-[11px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-text-muted"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  )
}
