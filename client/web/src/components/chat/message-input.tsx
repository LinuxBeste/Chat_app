import { useState } from "react"
import { Send, Paperclip, Smile } from "lucide-react"

interface MessageInputProps {
  conversationId: string
  onSend: (content: string) => void
}

export function MessageInput({ conversationId: _conversationId, onSend }: MessageInputProps) {
  const [value, setValue] = useState("")

  const handleSend = () => {
    if (!value.trim()) return
    onSend(value.trim())
    setValue("")
  }

  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3" role="form" aria-label="Message input">
      <button aria-label="Attach file" className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
      </button>
      <button aria-label="Insert emoji" className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Smile className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
        aria-label="Message text"
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
      />
      <button
        onClick={handleSend}
        aria-label="Send message"
        disabled={!value.trim()}
        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white hover:bg-accent-hover transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
