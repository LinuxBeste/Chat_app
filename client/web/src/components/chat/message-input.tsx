import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Send, Paperclip, Smile, Loader2 } from "lucide-react"
import { apiFormData } from "../../lib/api"

export interface AttachmentData {
  url: string
  filename: string
  mimeType: string
  size: number
}

interface MessageInputProps {
  conversationId: string
  onSend: (content: string, messageType?: string, attachment?: AttachmentData) => void
}

export function MessageInput({ conversationId: _conversationId, onSend }: MessageInputProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!value.trim() || uploading) return
    onSend(value.trim())
    setValue("")
  }

  const handleFilePick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await apiFormData<AttachmentData>("/api/uploads", formData)
      onSend(result.url, file.type.startsWith("image/") ? "image" : "file", result)
    } catch {
      // upload failed silently
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3" role="form" aria-label={t("chat.messageInput")}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <button
        onClick={handleFilePick}
        disabled={uploading}
        aria-label={t("chat.attachFile")}
        className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Paperclip className="h-4 w-4" aria-hidden="true" />}
      </button>
      <button
        aria-label={t("chat.insertEmoji")}
        className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Smile className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder={t("chat.typeMessage")}
        aria-label={t("chat.messageText")}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
      />
      <button
        onClick={handleSend}
        aria-label={t("chat.sendMessageBtn")}
        disabled={!value.trim() || uploading}
        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white hover:bg-accent-hover transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
