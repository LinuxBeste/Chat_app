import { useState, useEffect, useCallback, useRef } from "react"
import { MessageInput } from "./message-input"
import { CallOverlay } from "./call-overlay"
import { Avatar } from "../ui/avatar"
import { Phone, Video, MoreHorizontal, Edit3, Trash2, X, Check } from "lucide-react"
import { api } from "../../lib/api"
import { wsClient } from "../../lib/ws"

interface Message {
  id: string
  content: string
  type: string
  senderId: string
  createdAt: string
  editedAt: string | null
  deletedAt?: string | null
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
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    api<Message[]>(`/api/conversations/${conversationId}/messages`)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    const unsubNew = wsClient.on("message:new", (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data as unknown as Message])
      }
    })
    const unsubEdited = wsClient.on("message:edited", (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id ? { ...m, content: data.content as string, editedAt: data.editedAt as string } : m,
          ),
        )
      }
    })
    const unsubDeleted = wsClient.on("message:deleted", (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, deletedAt: new Date().toISOString(), content: "" } : m)),
        )
      }
    })
    return () => {
      unsubNew()
      unsubEdited()
      unsubDeleted()
    }
  }, [conversationId])

  useEffect(() => {
    const unsub = wsClient.on("call:offer", (data) => {
      if (data.conversationId === conversationId) {
        setCallState({ targetUserId: data.callerId as string, direction: "incoming" })
      }
    })
    return () => {
      unsub()
    }
  }, [conversationId])

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingMessageId])

  const handleSend = useCallback(
    (content: string) => {
      wsClient.send("message:send", { conversationId, content })
    },
    [conversationId],
  )

  const handleEdit = useCallback(
    (msg: Message) => {
      setEditingMessageId(msg.id)
      setEditText(msg.content)
      setMenuMessageId(null)
    },
    [],
  )

  const handleEditConfirm = useCallback(() => {
    if (!editingMessageId || !editText.trim()) return
    wsClient.send("message:edit", { messageId: editingMessageId, conversationId, content: editText.trim() })
    setEditingMessageId(null)
    setEditText("")
  }, [editingMessageId, editText, conversationId])

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null)
    setEditText("")
  }, [])

  const handleDelete = useCallback(
    (msg: Message) => {
      wsClient.send("message:delete", { messageId: msg.id, conversationId })
      setMenuMessageId(null)
    },
    [conversationId],
  )

  const otherSender = messages.find((m) => m.senderId !== currentUserId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col h-full" id="main-content">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border"
        role="toolbar"
        aria-label="Chat actions"
      >
        <div className="relative">
          <Avatar fallback={otherSender?.sender?.username?.[0] ?? "?"} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{otherSender?.sender?.username ?? "Chat"}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => otherSender && setCallState({ targetUserId: otherSender.senderId, direction: "outgoing" })}
            aria-label="Start voice call"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => otherSender && setCallState({ targetUserId: otherSender.senderId, direction: "outgoing" })}
            aria-label="Start video call"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Video className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="More options"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {loading && <p className="text-sm text-text-muted text-center">Loading...</p>}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId
          const isDeleted = !!msg.deletedAt
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} relative`} role="article">
              <div
                className={`max-w-[70%] rounded-3xl px-4 py-2.5 ${
                  isDeleted
                    ? "bg-surface text-text-muted border border-border italic"
                    : isMe
                      ? "bg-accent text-white rounded-br-lg"
                      : "bg-surface text-text-primary border border-border rounded-bl-lg"
                }`}
              >
                {!isMe && !isDeleted && <p className="text-xs text-text-muted mb-1">{msg.sender.username}</p>}
                {isDeleted ? (
                  <p className="text-sm leading-relaxed italic">This message was deleted</p>
                ) : editingMessageId === msg.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditConfirm()
                        if (e.key === "Escape") handleEditCancel()
                      }}
                      className={`flex-1 bg-transparent text-sm outline-none border-b ${
                        isMe ? "border-white/40 text-white" : "border-border text-text-primary"
                      }`}
                    />
                    <button onClick={handleEditConfirm} className="cursor-pointer" aria-label="Confirm edit">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={handleEditCancel} className="cursor-pointer" aria-label="Cancel edit">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : msg.type === "image" ? (
                  <img
                    src={msg.content}
                    alt="Shared image"
                    className="max-w-full rounded-2xl cursor-pointer"
                    onClick={() => window.open(msg.content, "_blank")}
                  />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                {!isDeleted && (
                  <p className={`text-[11px] mt-1 ${isMe ? "text-white/60" : "text-text-muted"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {msg.editedAt && <span className="ml-1">(edited)</span>}
                  </p>
                )}
              </div>
              {isMe && !isDeleted && editingMessageId !== msg.id && (
                <div className="relative ml-1 self-start mt-2">
                  <button
                    onClick={() => setMenuMessageId(menuMessageId === msg.id ? null : msg.id)}
                    aria-label="Message menu"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  {menuMessageId === msg.id && (
                    <div className="absolute right-0 top-8 z-50 bg-surface border border-border rounded-2xl shadow-lg py-1 min-w-[120px]">
                      <button
                        onClick={() => handleEdit(msg)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary hover:bg-white/5 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(msg)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/5 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
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

      {menuMessageId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuMessageId(null)} />
      )}
    </div>
  )
}
