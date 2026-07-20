import { useState } from "react"
import { Send, Paperclip, Smile } from "lucide-react"

export function MessageInput() {
  const [value, setValue] = useState("")

  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
      <button className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer">
        <Paperclip className="h-4 w-4" />
      </button>
      <button className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer">
        <Smile className="h-4 w-4" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
      />
      <button
        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white hover:bg-accent-hover transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!value.trim()}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
