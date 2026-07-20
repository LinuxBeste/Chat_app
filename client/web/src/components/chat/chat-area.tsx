import { useState, useEffect, useCallback } from "react"
import { MessageInput } from "./message-input"
import { CallOverlay } from "./call-overlay"
import { Avatar } from "../ui/avatar"
import { Phone, Video, MoreHorizontal } from "lucide-react"
import { api } from "../../lib/api"
import { wsClient } from "../../lib/ws"

interface Message {
  id: string
  content: string
  type: string
  senderId: string
  createdAt: string
  sender: {
    username: string
    displayName: string | null
    avatar: string | null
  }
}

interface ChatAreaProps {
  conversationId: string
  currentUserId: string
}

export function ChatArea({ conversationId, currentUserId }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [callState, setCallState] = useState<{ targetUserId: string; direction: "incoming" | "outgoing" } | null>(null)

  useEffect(() => {
    setLoading(true)
    api<Message[]>(`/api/conversations/${conversationId}/messages`)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    const unsub = wsClient.on("message:new", (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data as unknown as Message])
      }
    })
    return () => { unsub() }
  }, [conversationId])

  useEffect(() => {
    const unsub = wsClient.on("call:offer", (data) => {
      if (data.conversationId === conversationId) {
        setCallState({ targetUserId: data.callerId as string, direction: "incoming" })
      }
    })
    return () => { unsub() }
  }, [conversationId])

  const handleSend = useCallback(
    (content: string) => {
      wsClient.send("message:send", { conversationId, content })
    },
    [conversationId],
  )

  const otherSender = messages.find((m) => m.senderId !== currentUserId)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="relative">
          <Avatar fallback={otherSender?.sender?.username?.[0] ?? "?"} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">
            {otherSender?.sender?.username ?? "Chat"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => otherSender && setCallState({ targetUserId: otherSender.senderId, direction: "outgoing" })}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => otherSender && setCallState({ targetUserId: otherSender.senderId, direction: "outgoing" })}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            <Video className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && <p className="text-sm text-text-muted text-center">Loading...</p>}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId
          return (
          <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-3xl px-4 py-2.5 ${
                  isMe
                    ? "bg-accent text-white rounded-br-lg"
                    : "bg-surface text-text-primary border border-border rounded-bl-lg"
                }`}
              >
                {!isMe && (
                  <p className="text-xs text-text-muted mb-1">{msg.sender.username}</p>
                )}
                {msg.type === "image" ? (
                  <img
                    src={msg.content}
                    alt=""
                    className="max-w-full rounded-2xl cursor-pointer"
                    onClick={() => window.open(msg.content, "_blank")}
                  />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-[11px] mt-1 ${isMe ? "text-white/60" : "text-text-muted"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <MessageInput conversationId={conversationId} onSend={handleSend} />

      {callState && (
        <CallOverlay
          conversationId={conversationId}
          targetUserId={callState.targetUserId}
          direction={callState.direction}
          onEnd={() => setCallState(null)}
        />
      )}
    </div>
  )
}
