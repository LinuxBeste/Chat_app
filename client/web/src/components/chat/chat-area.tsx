import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { MessageInput, type AttachmentData } from "./message-input"
import { CallOverlay } from "./call-overlay"
import { AddParticipantsModal } from "./add-participants-modal"
import { Avatar } from "../ui/avatar"
import {
  Phone, Video, MoreHorizontal, Edit3, Trash2, X, Check, FileText, Download,
  Plus, Users, UserPlus, Copy, Ban, Shield, LogOut, ArrowLeft, Search, Bell,
  BellOff, Flag, Camera,
} from "lucide-react"
import { api, apiFormData, BASE_URL } from "../../lib/api"

function displayName(url: string, attachment?: Attachment): string {
  if (attachment?.filename) return attachment.filename
  const name = url.split("/").pop() || "file"
  return name.replace(/^\d+-\d+-/, "")
}
import { useToast } from "../../lib/toast-context"
import { wsClient } from "../../lib/ws"
import { useNav } from "../layout/dashboard-layout"
import { cacheMessages, getCachedMessages, subscribeToOnlineStatus, isOnline as checkOnline, getPendingMessages } from "../../lib/offline"

interface Attachment {
  id: string
  url: string
  filename: string
  mimeType: string
  size: number
}

interface Message {
  id: string
  content: string
  type: string
  messageType?: string
  senderId: string
  createdAt: string
  editedAt: string | null
  deletedAt?: string | null
  sender: {
    username: string
    displayName: string | null
    avatar: string | null
  }
  attachment?: Attachment
}

interface Member {
  id: string
  username: string
  displayName: string | null
  avatar: string | null
  status: string
  role: string
}

interface ConversationInfo {
  id: string
  type: string
  name: string | null
  avatar: string | null
  createdBy: string
  members: Member[]
}

interface ChatAreaProps {
  conversationId: string
  currentUserId: string
  onLeave?: () => void
}

export function ChatArea({ conversationId, currentUserId, onLeave }: ChatAreaProps) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [convInfo, setConvInfo] = useState<ConversationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [callState, setCallState] = useState<{ targetUserId: string; direction: "incoming" | "outgoing" } | null>(null)
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<string | null>(null)
  const [addingFriend, setAddingFriend] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [showConvMenu, setShowConvMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState("")
  const [filePreview, setFilePreview] = useState<Message | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const [offline, setOffline] = useState(!checkOnline())
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => {
    return subscribeToOnlineStatus(
      () => setOffline(false),
      () => setOffline(true),
    )
  }, [])

  useEffect(() => {
    setLoading(true)
    if (offline) {
      const cached = getCachedMessages(conversationId)
      if (cached.length > 0) {
        setMessages(cached as Message[])
        setConvInfo({ id: conversationId, type: "group", name: null, avatar: null, createdBy: "", members: [] })
        setLoading(false)
        return
      }
    }
    Promise.all([
      api<Message[]>(`/api/conversations/${conversationId}/messages`),
      api<ConversationInfo>(`/api/conversations/${conversationId}`),
    ])
      .then(([msgs, info]) => {
        setMessages(msgs)
        setConvInfo(info)
        cacheMessages(conversationId, msgs)
      })
      .catch(() => {
        const cached = getCachedMessages(conversationId)
        if (cached.length > 0) {
          setMessages(cached as Message[])
          setConvInfo({ id: conversationId, type: "group", name: null, avatar: null, createdBy: "", members: [] })
        } else {
          showToast(t("chat.loadError"))
        }
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  const { setActiveConversationId, setView } = useNav()
  const currentMember = convInfo?.members.find((m) => m.id === currentUserId)
  const canManage = currentMember?.role === "owner" || currentMember?.role === "admin"
  const isGroup = convInfo?.type === "group" || convInfo?.type === "channel"
  const otherSender = messages.find((m) => m.senderId !== currentUserId)
  const otherMember = !isGroup ? convInfo?.members.find((m) => m.id !== currentUserId) : undefined
  const dmName = otherSender?.sender?.displayName ?? otherSender?.sender?.username ?? otherMember?.displayName ?? otherMember?.username ?? t("chat.dmConversation")
  const dmInitial = (otherSender?.sender?.username ?? otherMember?.username ?? "?")[0].toUpperCase()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (filePreview?.attachment?.mimeType?.startsWith("text/")) {
      fetch(`${BASE_URL}${filePreview.content}`)
        .then((r) => r.text())
        .then(setPreviewText)
        .catch(() => setPreviewText(null))
    } else {
      setPreviewText(null)
    }
  }, [filePreview])

  const handleRemoveParticipant = async (userId: string) => {
    try {
      await api(`/api/conversations/${conversationId}/participants/${userId}`, { method: "DELETE" })
      setConvInfo((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev,
      )
      setShowMemberMenu(null)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const unsubNew = wsClient.on("message:new", (data: any) => {
      if (data.conversationId === conversationId) {
        const msg: Message = {
          id: data.id,
          content: data.content,
          type: data.messageType || data.type,
          senderId: data.senderId,
          createdAt: data.createdAt,
          editedAt: null,
          sender: data.sender,
          attachment: data.attachment,
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          const next = [...prev, msg]
          cacheMessages(conversationId, next)
          return next
        })
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

  useEffect(() => {
    if (!isGroup && otherSender) {
      const otherId = otherSender.senderId
      api<{ status: string }>(`/api/friends/status/${otherId}`)
        .then((res) => setFriendStatus(res.status))
        .catch(() => setFriendStatus(null))
      api<{ blockedUserId: string }[]>("/api/privacy/blocks")
        .then((list) => setBlocked(list.some((b) => b.blockedUserId === otherId)))
        .catch(() => setBlocked(false))
    } else {
      setFriendStatus(null)
      setBlocked(false)
    }
  }, [conversationId, messages])

  const { showToast } = useToast()

  const handleAddFriend = async () => {
    if (!otherSender || addingFriend) return
    setAddingFriend(true)
    try {
      await api("/api/friends/requests", {
        method: "POST",
        body: JSON.stringify({ friendId: otherSender.senderId }),
      })
      setFriendStatus("pending")
      showToast(t("chat.friendRequestSent"), "success")
    } catch (err: any) {
      if (err?.message?.includes("already exists")) {
        setFriendStatus("pending")
        showToast(t("chat.friendRequestExists"))
      } else {
        showToast(err?.message ?? t("chat.friendRequestError"))
      }
    } finally {
      setAddingFriend(false)
    }
  }

  const handleBlockUser = useCallback(async () => {
    if (!otherSender) return
    try {
      await api("/api/privacy/blocks", {
        method: "POST",
        body: JSON.stringify({ userId: otherSender.senderId }),
      })
      setBlocked(true)
      setShowConvMenu(false)
      showToast(t("chat.userBlocked"), "success")
    } catch {
      showToast(t("chat.blockError"))
    }
  }, [otherSender, showToast, t])

  const handleUnblockUser = useCallback(async () => {
    if (!otherSender) return
    try {
      await api(`/api/privacy/blocks/${otherSender.senderId}`, { method: "DELETE" })
      setBlocked(false)
      setShowConvMenu(false)
      showToast(t("chat.userUnblocked"), "success")
    } catch {
      showToast(t("chat.unblockError"))
    }
  }, [otherSender, showToast, t])

  const handleSend = useCallback(
    (content: string, messageType?: string, attachment?: AttachmentData) => {
      wsClient.send("message:send", { conversationId, content, messageType, attachment })
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

  const handleLeaveConversation = useCallback(async () => {
    try {
      await api(`/api/conversations/${conversationId}/participants/${currentUserId}`, { method: "DELETE" })
      showToast(t("chat.leftConversation"), "success")
      setShowConvMenu(false)
      onLeave?.()
    } catch {
      showToast(t("chat.leaveError"))
    }
  }, [conversationId, currentUserId, showToast, t, onLeave])

  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append("avatar", file)
      const res = await apiFormData<{ avatar: string }>(`/api/conversations/${conversationId}/avatar`, formData)
      setConvInfo((prev) => (prev ? { ...prev, avatar: res.avatar } : prev))
      showToast(t("chat.avatarUpdated"), "success")
    } catch {
      showToast(t("chat.avatarError"))
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ""
  }, [conversationId, showToast, t])

  const navigateToDm = useCallback(async (targetUserId: string) => {
    try {
      const conv = await api<{ id: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: [targetUserId] }),
      })
      setActiveConversationId(conv.id)
      setView("chat")
    } catch { /* ignore */ }
  }, [setActiveConversationId, setView])

  const handleStartRename = useCallback(() => {
    setRenameText(convInfo?.name ?? "")
    setRenaming(true)
    setShowConvMenu(false)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }, [convInfo])

  const handleRenameConfirm = useCallback(async () => {
    if (!renameText.trim()) return
    try {
      const updated = await api<{ name: string }>(`/api/conversations/${conversationId}`, {
        method: "PUT",
        body: JSON.stringify({ name: renameText.trim() }),
      })
      setConvInfo((prev) => (prev ? { ...prev, name: updated.name } : prev))
      setRenaming(false)
      showToast(t("chat.renamed"), "success")
    } catch {
      showToast(t("chat.renameError"))
    }
  }, [renameText, conversationId, showToast, t])

  const handleRenameCancel = useCallback(() => {
    setRenaming(false)
    setRenameText("")
  }, [])

  const handleCopyUserId = useCallback(async () => {
    if (!otherSender) return
    try {
      await navigator.clipboard.writeText(otherSender.senderId)
      showToast(t("chat.userIdCopied"), "success")
      setShowConvMenu(false)
    } catch {
      showToast(t("chat.copyError"))
    }
  }, [otherSender, showToast, t])

  const handleReportUser = useCallback(async () => {
    if (!otherSender) return
    try {
      await api("/api/moderation/reports", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: otherSender.senderId,
          reason: "User report from conversation menu",
        }),
      })
      setShowConvMenu(false)
      showToast(t("chat.userReported"), "success")
    } catch {
      showToast(t("chat.reportError"))
    }
  }, [otherSender, showToast, t])

  const [muted, setMuted] = useState(false)

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev)
    showToast(muted ? t("chat.unmuted") : t("chat.muted"))
  }, [muted, showToast, t])

  return (
    <div className="flex flex-col h-full" id="main-content">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border"
        role="toolbar"
        aria-label={t("chat.chatActions")}
      >
        <button
          onClick={onLeave}
          className="flex md:hidden h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer mr-1"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          <Avatar src={convInfo?.avatar ?? undefined} fallback={convInfo?.name?.[0] ?? dmInitial} />
        </div>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1">
              <input
                ref={renameInputRef}
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameConfirm()
                  if (e.key === "Escape") handleRenameCancel()
                }}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-text-primary w-full outline-none focus:border-accent"
              />
              <button onClick={handleRenameConfirm} className="text-accent hover:text-accent-hover cursor-pointer p-1">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={handleRenameCancel} className="text-text-muted hover:text-text-secondary cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-text-primary">
                {convInfo?.name ?? dmName}
              </h3>
              {isGroup && convInfo && (
                <p className="text-xs text-text-muted truncate">
                  {t("chat.membersCount", { count: convInfo.members.length })}
                  {currentMember && (
                    <span className="ml-2 lowercase text-accent">· {currentMember.role}</span>
                  )}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isGroup && otherSender && friendStatus && friendStatus !== "accepted" && friendStatus !== "self" && (
            <button
              onClick={handleAddFriend}
              disabled={addingFriend || friendStatus === "pending"}
              aria-label={friendStatus === "pending" ? t("chat.friendPending") : t("chat.addFriend")}
              className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                friendStatus === "pending"
                  ? "text-yellow-400 bg-yellow-500/10"
                  : "text-text-muted hover:text-accent hover:bg-accent/10"
              }`}
              title={friendStatus === "pending" ? t("chat.friendPending") : t("chat.addFriend")}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {isGroup && canManage && (
            <button
              onClick={() => setShowAddPeople(true)}
              aria-label={t("chat.addPeople")}
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={() => otherSender && setCallState({ targetUserId: otherSender.senderId, direction: "outgoing" })}
            aria-label={t("chat.startVoiceCall")}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => otherSender && setCallState({ targetUserId: otherSender.senderId, direction: "outgoing" })}
            aria-label={t("chat.startVideoCall")}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Video className="h-4 w-4" aria-hidden="true" />
          </button>
          {offline && (() => {
            const pendingCount = getPendingMessages().length
            return (
              <div className="flex h-9 items-center gap-1.5 px-2 rounded-2xl text-yellow-400 bg-yellow-500/10 text-xs font-medium" title={t("chat.offline")}>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                <span>{t("chat.offline")}</span>
                {pendingCount > 0 && (
                  <span className="ml-0.5 bg-yellow-400/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </div>
            )
          })()}
          {isGroup && canManage && (
            <div className="relative">
              <button
                onClick={() => setShowMemberMenu(showMemberMenu === "header" ? null : "header")}
                aria-label={t("chat.manageMembers")}
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
              </button>
              {showMemberMenu === "header" && (
                <div className="absolute right-0 top-10 z-50 bg-surface border border-border rounded-2xl shadow-lg py-1 min-w-[200px] max-h-72 overflow-y-auto">
                  <p className="text-xs text-text-muted px-3 py-2 font-medium">{t("chat.members")}</p>
                  {convInfo?.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold shrink-0">
                        {(m.displayName || m.username)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary truncate">{m.displayName || m.username}</p>
                        <p className="text-[10px] text-text-muted capitalize">{m.role}</p>
                      </div>
                      {canManage && m.id !== currentUserId && m.role !== "owner" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveParticipant(m.id) }}
                          className="text-text-muted hover:text-danger cursor-pointer"
                          title={t("chat.remove")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <button
              onClick={() => setShowConvMenu(!showConvMenu)}
              aria-label={t("chat.moreOptions")}
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showConvMenu ? (
        <div className="flex-1 overflow-y-auto bg-surface">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
            <button
              onClick={() => setShowConvMenu(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-text-primary">
              {isGroup ? t("chat.groupInfo") : t("chat.contactInfo")}
            </h2>
            {isGroup && canManage && (
              <button
                onClick={handleStartRename}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center py-8 px-4">
            <div className="relative w-20 h-20 mb-4">
              <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center text-accent text-3xl font-bold overflow-hidden">
                {convInfo?.avatar ? (
                  <img src={convInfo.avatar} alt="" className="h-full w-full object-cover" />
                ) : isGroup ? (
                  (convInfo?.name?.[0] ?? "G")
                ) : (
                  dmInitial
                )}
              </div>
              {isGroup && canManage && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            <h1 className="text-lg font-bold text-text-primary text-center">
              {isGroup
                ? (convInfo?.name ?? t("chat.groupConversation"))
                : dmName
              }
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {isGroup
                ? t("chat.membersCount", { count: convInfo?.members.length ?? 0 }) + " · " + (convInfo?.type ?? "group")
                : dmName
              }
            </p>
          </div>

          <div className="flex justify-center gap-8 pb-6 px-4">
            <button
              onClick={() => { setShowConvMenu(false); const targetId = otherSender?.senderId ?? otherMember?.id; targetId && setCallState({ targetUserId: targetId, direction: "outgoing" }) }}
              className="flex flex-col items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-accent" />
              </div>
              <span className="text-xs">{t("chat.call")}</span>
            </button>
            <button
              onClick={() => { setShowConvMenu(false); const targetId = otherSender?.senderId ?? otherMember?.id; targetId && setCallState({ targetUserId: targetId, direction: "outgoing" }) }}
              className="flex flex-col items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-accent" />
              </div>
              <span className="text-xs">{t("chat.video")}</span>
            </button>
            <button
              onClick={toggleMute}
              className="flex flex-col items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                {muted ? <BellOff className="h-5 w-5 text-accent" /> : <Bell className="h-5 w-5 text-accent" />}
              </div>
              <span className="text-xs">{muted ? t("chat.unmute") : t("chat.mute")}</span>
            </button>
          </div>

          {isGroup ? (
            <>
              <div className="border-t border-border">
                <div className="px-4 py-3">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t("chat.members")}</h3>
                  {convInfo?.members.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-white/[0.02] rounded-lg"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return
                        navigateToDm(m.id)
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {(m.displayName || m.username)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{m.displayName || m.username}</p>
                        <p className="text-xs text-text-muted capitalize">{m.role} · {m.status}</p>
                      </div>
                      {canManage && m.id !== currentUserId && m.role !== "owner" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveParticipant(m.id) }}
                          className="text-text-muted hover:text-danger cursor-pointer shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {convInfo && convInfo.members.length > 6 && (
                    <button
                      onClick={() => { setShowConvMenu(false); setShowMemberMenu("header") }}
                      className="text-sm text-accent hover:text-accent-hover mt-1 cursor-pointer"
                    >
                      {t("chat.viewAllMembers", { count: convInfo.members.length })}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-border px-4 py-2">
                <button
                  onClick={() => { setShowConvMenu(false); setShowMemberMenu(showMemberMenu === "header" ? null : "header") }}
                  className="flex items-center gap-3 w-full py-3 text-sm text-text-primary hover:text-text-secondary transition-colors cursor-pointer"
                >
                  <Users className="h-5 w-5 text-text-muted shrink-0" /> {t("chat.manageMembers")}
                </button>
                {canManage && (
                  <button
                    onClick={() => { setShowConvMenu(false); setShowAddPeople(true) }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-text-primary hover:text-text-secondary transition-colors cursor-pointer"
                  >
                    <Plus className="h-5 w-5 text-text-muted shrink-0" /> {t("chat.addPeople")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="border-t border-border px-4 py-2">
              <button
                onClick={handleCopyUserId}
                className="flex items-center gap-3 w-full py-3 text-sm text-text-primary hover:text-text-secondary transition-colors cursor-pointer"
              >
                <Copy className="h-5 w-5 text-text-muted shrink-0" /> {t("chat.copyUserId")}
              </button>
              {friendStatus && friendStatus !== "accepted" && friendStatus !== "self" && friendStatus !== "pending" ? (
                <button
                  onClick={handleAddFriend}
                  disabled={addingFriend}
                  className="flex items-center gap-3 w-full py-3 text-sm text-text-primary hover:text-text-secondary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="h-5 w-5 text-text-muted shrink-0" /> {t("chat.addFriend")}
                </button>
              ) : friendStatus === "pending" ? (
                <div className="flex items-center gap-3 w-full py-3 text-sm text-yellow-400">
                  <UserPlus className="h-5 w-5 shrink-0" /> {t("chat.friendPending")}
                </div>
              ) : null}
            </div>
          )}

          <div className="border-t border-border px-4 py-2">
            <button
              onClick={() => {}}
              className="flex items-center gap-3 w-full py-3 text-sm text-text-primary hover:text-text-secondary transition-colors cursor-pointer"
            >
              <Search className="h-5 w-5 text-text-muted shrink-0" /> {t("chat.searchInConversation")}
            </button>
          </div>

          {!isGroup && (
            <div className="border-t border-border px-4 py-2">
              {blocked ? (
                <button
                  onClick={handleUnblockUser}
                  className="flex items-center gap-3 w-full py-3 text-sm text-text-primary hover:text-text-secondary transition-colors cursor-pointer"
                >
                  <Shield className="h-5 w-5 text-text-muted shrink-0" /> {t("chat.unblockUser")}
                </button>
              ) : (
                <button
                  onClick={handleBlockUser}
                  className="flex items-center gap-3 w-full py-3 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Ban className="h-5 w-5 shrink-0" /> {t("chat.blockUser")}
                </button>
              )}
              <button
                onClick={handleReportUser}
                className="flex items-center gap-3 w-full py-3 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <Flag className="h-5 w-5 shrink-0" /> {t("chat.reportUser")}
              </button>
            </div>
          )}

          <div className="border-t border-border px-4 py-2 mt-2">
            <button
              onClick={handleLeaveConversation}
              className="flex items-center gap-3 w-full py-3 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 shrink-0" /> {isGroup ? t("chat.leaveConversation") : t("chat.deleteConversation")}
            </button>
          </div>

          <div className="h-12" />
        </div>
      ) : (
        <>
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            role="log"
            aria-live="polite"
            aria-label={t("chat.chatMessages")}
          >
            {loading && <p className="text-sm text-text-muted text-center">{t("common.loading")}</p>}
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
                  <p className="text-sm leading-relaxed italic">{t("chat.messageDeleted")}</p>
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
                    <button onClick={handleEditConfirm} className="cursor-pointer" aria-label={t("chat.confirmEdit")}>
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={handleEditCancel} className="cursor-pointer" aria-label={t("chat.cancelEdit")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : msg.type === "image" ? (
                  <img
                    src={`${BASE_URL}${msg.content}`}
                    alt={t("chat.sharedImage")}
                    className="max-w-full rounded-2xl cursor-pointer"
                    onClick={() => setFilePreview(msg)}
                  />
                ) : msg.type === "file" ? (
                  <button
                    onClick={() => setFilePreview(msg)}
                    className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors w-full text-left no-underline cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{displayName(msg.content, msg.attachment)}</p>
                      <p className="text-xs text-text-muted">{t("chat.fileType", { ext: displayName(msg.content, msg.attachment).split(".").pop()?.toUpperCase() || "?" })}</p>
                    </div>
                    <Download className="h-4 w-4 text-text-muted shrink-0" />
                  </button>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                {!isDeleted && (
                  <p className={`text-[11px] mt-1 ${isMe ? "text-white/60" : "text-text-muted"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {msg.editedAt && <span className="ml-1">{t("chat.edited")}</span>}
                  </p>
                )}
              </div>
              {isMe && !isDeleted && editingMessageId !== msg.id && (
                <div className="relative ml-1 self-start mt-2">
                  <button
                    onClick={() => setMenuMessageId(menuMessageId === msg.id ? null : msg.id)}
                    aria-label={t("chat.messageMenu")}
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
                        <Edit3 className="h-3.5 w-3.5" /> {t("chat.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(msg)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/5 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("chat.delete")}
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

      {showAddPeople && (
        <AddParticipantsModal
          conversationId={conversationId}
          onClose={() => setShowAddPeople(false)}
          onAdded={() => {
            api<ConversationInfo>(`/api/conversations/${conversationId}`).then(setConvInfo).catch(() => {})
          }}
        />
      )}

      {filePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setFilePreview(null); setPreviewText(null) }}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-[32px] border border-border bg-surface shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-text-primary truncate">{displayName(filePreview.content, filePreview.attachment)}</h3>
              <button onClick={() => { setFilePreview(null); setPreviewText(null) }} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 pb-5 max-h-[60vh] overflow-y-auto">
              {filePreview.type === "image" ? (
                <img src={`${BASE_URL}${filePreview.content}`} alt={filePreview.attachment?.filename || ""} className="max-w-full rounded-2xl" />
              ) : filePreview.attachment?.mimeType?.startsWith("text/") ? (
                <pre className="text-sm text-text-primary bg-bg-primary rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">{previewText ?? t("common.loading")}</pre>
              ) : filePreview.attachment?.mimeType === "application/pdf" ? (
                <iframe src={`${BASE_URL}${filePreview.content}`} className="w-full h-[60vh] rounded-2xl" title={filePreview.attachment?.filename || ""} />
              ) : (
                <div className="flex flex-col items-center gap-4 py-8 text-text-muted">
                  <FileText className="h-12 w-12" />
                  <p className="text-sm">{t("files.cannotPreview")}</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${BASE_URL}${filePreview.content}`)
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = displayName(filePreview.content, filePreview.attachment)
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch { /* ignore */ }
                    }}
                    className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    {t("files.download")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showMemberMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMemberMenu(null)} />
      )}
    </>
  )}
</div>
)
}
