import { useState, useEffect, useRef, useCallback } from "react"
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, Modal, ActivityIndicator, ScrollView
} from "react-native"
import {
  Image as ImageIcon, Paperclip, SmilePlus, FileText,
  X, Send, ChevronLeft, Phone, Video, Reply, Copy, Pin, Trash2, Flag,
  UserPlus, UserMinus, Shield, ShieldOff, Settings, Edit3, LogOut,
  Users, MessageSquare, Ban, Lock, ThumbsUp, Bell, BellOff, Search
} from "lucide-react-native"
import { api, apiFormData } from "../lib/api"
import { wsClient } from "../lib/ws"
import { useAuth } from "../lib/auth-context"
import { encryptMessage, decryptMessage, isEncrypted, stripEncryptionPrefix } from "../lib/crypto"
import { useTranslation } from "react-i18next"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import type { ImagePickerAsset } from "expo-image-picker"
import { EmojiPicker } from "../components/emoji-picker"
import { CallOverlay } from "../components/call-overlay"
import { AddParticipantsModal } from "../components/add-participants-modal"
import * as Clipboard from "expo-clipboard"
import { MediaGallery } from "../components/media-gallery"

interface Reaction {
  emoji: string
  userId: string
  username: string
}

interface Msg {
  id: string
  content: string
  senderId: string
  createdAt: string
  editedAt?: string
  deletedAt?: string
  sender: { id: string; username: string; displayName?: string }
  fileUrl?: string
  fileName?: string
  fileType?: string
  replyTo?: { id: string; content: string; sender: { username: string; displayName?: string } }
  encrypted?: boolean | string
  messageType?: string
  attachment?: { url: string; filename: string; mimeType: string; size: number }
  reactions?: Reaction[]
}

interface ConvInfo {
  id: string
  type: "dm" | "group" | "channel"
  name: string | null
  avatar?: string
  members: { id: string; username: string; displayName?: string; role?: string; avatar?: string; status?: string }[]
  createdBy?: string
}

export function ChatScreen({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null)
  const [decrypted, setDecrypted] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [showEmoji, setShowEmoji] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [previewFile, setPreviewFile] = useState<Msg | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [mediaItems, setMediaItems] = useState<Msg[]>([])
  const [inCall, setInCall] = useState<"voice" | "video" | null>(null)
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null)
  const [msgStatus, setMsgStatus] = useState<Record<string, "sending" | "sent" | "failed">>({})
  const flatRef = useRef<FlatList>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const theirKeyRef = useRef<string | null>(null)

  const [showInfo, setShowInfo] = useState(false)
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted" | "self">("none")
  const [isBlocked, setIsBlocked] = useState(false)
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState("")
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  const [showPinned, setShowPinned] = useState(false)
  const [muted, setMuted] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Msg[]>([])

  const isDm = convInfo?.type === "dm"
  const otherMember = isDm ? convInfo?.members?.find((m) => m.id !== user!.id) : undefined

  const COMMON_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

  const getTheirKey = useCallback(async (userId: string): Promise<string | null> => {
    if (theirKeyRef.current) return theirKeyRef.current
    try {
      const res = await api<{ publicKey: string }>(`/api/e2ee/key/${userId}`)
      theirKeyRef.current = res.publicKey
      return res.publicKey
    } catch { return null }
  }, [])

  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        const formData = new FormData()
        formData.append("avatar", { uri: file.uri, name: "avatar.jpg", type: file.mimeType } as any)
        const res = await apiFormData<{ avatar: string }>(`/api/conversations/${conversationId}/avatar`, formData)
        setConvInfo((p) => p ? { ...p, avatar: res.avatar } : p)
      }
    } catch {}
  }

  const toggleMute = () => setMuted((p) => !p)

  const loadPinnedMessages = async () => {
    try {
      const data = await api<any[]>(`/api/pins/${conversationId}`)
      setPinnedMessages(data)
    } catch {}
  }

  const pinMessage = async (messageId: string) => {
    try {
      await api("/api/pins", { method: "POST", body: JSON.stringify({ conversationId, messageId }) })
      loadPinnedMessages()
    } catch {}
  }

  const unpinMessage = async (messageId: string) => {
    try {
      await api(`/api/pins/${conversationId}/${messageId}`, { method: "DELETE" })
      loadPinnedMessages()
    } catch {}
  }

  useEffect(() => {
    theirKeyRef.current = null
  }, [conversationId])

  useEffect(() => {
    api<ConvInfo>(`/api/conversations/${conversationId}`).then((info) => {
      setConvInfo(info)
      if (info.type === "dm") {
        const other = info.members.find((m) => m.id !== user!.id)
        if (other) getTheirKey(other.id)
      }
    }).catch(() => {})
    api<Msg[]>(`/api/conversations/${conversationId}/messages`).then((msgs) => {
      setMessages(msgs); decryptMessages(msgs)
    }).catch(() => {})
    loadMedia()
    checkFriendStatus()
    checkBlocked()
    loadPinnedMessages()
  }, [conversationId])

  const checkFriendStatus = async () => {
    if (!otherMember?.id) return
    try {
      const res = await api<{ status: string }>(`/api/friends/status/${otherMember.id}`)
      setFriendStatus(res.status as any)
    } catch {}
  }

  const checkBlocked = async () => {
    if (!otherMember?.id) return
    try {
      const blocks = await api<{ targetId: string }[]>("/api/privacy/blocks")
      setIsBlocked(blocks.some((b) => b.targetId === otherMember.id))
    } catch {}
  }

  const addFriend = async () => {
    if (!otherMember?.id) return
    try {
      await api("/api/friends/requests", { method: "POST", body: JSON.stringify({ friendId: otherMember.id }) })
      setFriendStatus("pending")
    } catch {}
  }

  const toggleBlock = async () => {
    if (!otherMember?.id) return
    try {
      if (isBlocked) {
        await api(`/api/privacy/blocks/${otherMember.id}`, { method: "DELETE" })
        setIsBlocked(false)
      } else {
        await api("/api/privacy/blocks", { method: "POST", body: JSON.stringify({ userId: otherMember.id }) })
        setIsBlocked(true)
      }
    } catch {}
  }

  const reportUser = () => {
    if (!otherMember?.id) return
    Alert.alert("Report User", "Are you sure you want to report this user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: () => {
        api("/api/moderation/reports", { method: "POST", body: JSON.stringify({ targetUserId: otherMember.id, reason: "Inappropriate behavior" }) }).catch(() => {})
      }},
    ])
  }

  const deleteConversation = () => {
    Alert.alert("Delete Conversation", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        api(`/api/conversations/${conversationId}`, { method: "DELETE" }).then(() => onBack()).catch(() => {})
      }},
    ])
  }

  const leaveGroup = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => {
        api(`/api/conversations/${conversationId}/participants/${user!.id}`, { method: "DELETE" }).then(() => onBack()).catch(() => {})
      }},
    ])
  }

  const renameGroup = async () => {
    if (!renameText.trim()) return
    try {
      await api(`/api/conversations/${conversationId}`, { method: "PUT", body: JSON.stringify({ name: renameText.trim() }) })
      setConvInfo((p) => p ? { ...p, name: renameText.trim() } : p)
      setRenaming(false)
    } catch {}
  }

  const navigateToDm = async (targetUserId: string) => {
    try {
      const conv = await api<{ id: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: [targetUserId] }),
      })
      setShowInfo(false)
      onBack()
      setTimeout(() => { /* parent handles navigation */ }, 100)
    } catch {}
  }

  useEffect(() => {
    const unsubs = [
      wsClient.on("message:new", async (data: any) => {
        if (data.conversationId === conversationId) {
          let content = data.content
          if ((data.encrypted === "true" || data.encrypted === true) && isEncrypted(content)) {
            const key = data.senderId !== user!.id ? await getTheirKey(data.senderId) : undefined
            const dec = await decryptMessage(conversationId, stripEncryptionPrefix(content), key ?? undefined)
            if (dec) content = dec
          }
          setMessages((p) => p.some((m) => m.id === data.id) ? p : [...p, { ...data, content, encrypted: data.encrypted } as Msg])
        }
      }),
      wsClient.on("message:edited", (data: any) => {
        if (data.conversationId === conversationId) {
          setMessages((p) => p.map((m) => m.id === data.messageId ? { ...m, content: data.content, editedAt: data.editedAt } : m))
        }
      }),
      wsClient.on("message:deleted", (data: any) => {
        if (data.conversationId === conversationId) {
          setMessages((p) => p.map((m) => m.id === data.messageId ? { ...m, content: "message deleted", deletedAt: new Date().toISOString() } : m))
        }
      }),
      wsClient.on("message:reaction", (data: any) => {
        if (data.conversationId === conversationId) {
          setMessages((p) => p.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions || [] } : m))
        }
      }),
      wsClient.on("typing:indicator", (data: any) => {
        if (data.conversationId === conversationId && data.userId !== user!.id) {
          setTypingUsers((p) => p.includes(data.userId) ? p : [...p, data.userId])
          clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => setTypingUsers([]), 3000)
        }
      }),
    ]
    return () => { unsubs.forEach((u) => u()) }
  }, [conversationId])

  const loadMedia = async () => {
    try {
      const msgs = await api<Msg[]>(`/api/conversations/${conversationId}/messages?limit=50`)
      setMediaItems(msgs.filter((m) => m.messageType === "image" || (m.fileUrl && m.fileType?.startsWith("image/"))))
    } catch {}
  }

  const decryptMessages = useCallback(async (msgs: Msg[]) => {
    const entries = await Promise.all(
      msgs.map(async (m) => {
        if (isEncrypted(m.content)) {
          const key = m.senderId !== user!.id && otherMember?.id ? await getTheirKey(otherMember.id) : undefined
          const plain = await decryptMessage(conversationId, stripEncryptionPrefix(m.content), key ?? undefined)
          return [m.id, plain || m.content] as [string, string]
        }
        return [m.id, m.content] as [string, string]
      })
    )
    setDecrypted((p) => ({ ...p, ...Object.fromEntries(entries) }))
  }, [conversationId, otherMember?.id])

  const send = async () => {
    if (!input.trim()) return
    const tempId = "temp_" + Date.now()
    const text = input.trim()
    setMsgStatus((p) => ({ ...p, [tempId]: "sending" }))
    setMessages((p) => [...p, {
      id: tempId, content: text, senderId: user!.id, createdAt: new Date().toISOString(),
      sender: { id: user!.id, username: user!.username },
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, sender: replyingTo.sender } : undefined,
      messageType: "text",
    } as Msg])
    setInput("")
    setReplyingTo(null)

    let finalContent = text
    let encrypted = false
    if (isDm && otherMember?.id) {
      const theirKey = await getTheirKey(otherMember.id)
      if (theirKey) {
        const ciphertext = await encryptMessage(conversationId, text, theirKey)
        if (ciphertext) {
          finalContent = "e2ee:" + ciphertext
          encrypted = true
        }
      }
    }
    const payload: any = { conversationId, content: finalContent, encrypted: encrypted ? "true" : "false", messageType: "text" }
    if (replyingTo) payload.replyToId = replyingTo.id
    wsClient.send("message:send", payload)
    setMsgStatus((p) => ({ ...p, [tempId]: "sent" }))
    setTimeout(() => setMsgStatus((p) => { const r = { ...p }; delete r[tempId]; return r }), 2000)
  }

  const confirmEdit = async () => {
    if (!editingId || !editText.trim()) return
    wsClient.send("message:edit", { messageId: editingId, conversationId, content: editText.trim() })
    setEditingId(null); setEditText("")
  }

  const deleteMsg = (msgId: string) => {
    wsClient.send("message:delete", { messageId: msgId, conversationId })
    setMessages((p) => p.map((m) => m.id === msgId ? { ...m, content: "message deleted", deletedAt: new Date().toISOString() } : m))
  }

  const addReaction = async (messageId: string, emoji: string) => {
    wsClient.send("message:reaction", { messageId, conversationId, emoji })
    setShowReactionPicker(null)
  }

  const handleInputChange = (text: string) => {
    setInput(text)
    wsClient.send("typing:indicator", { conversationId })
  }

  const uploadAndSend = async (file: { uri: string; name: string; type: string }) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", { uri: file.uri, name: file.name, type: file.type } as any)
      formData.append("conversationId", conversationId)
      const result = await apiFormData<{ url: string; filename: string; mimeType: string; size: number }>("/api/uploads", formData)
      const messageType = file.type.startsWith("image/") ? "image" : "file"
      const attachment = { url: result.url, filename: result.filename, mimeType: result.mimeType, size: result.size }
      const tempId = "temp_" + Date.now()
      setMessages((p) => [...p, {
        id: tempId, content: result.url, senderId: user!.id, createdAt: new Date().toISOString(),
        sender: { id: user!.id, username: user!.username },
        messageType, fileUrl: result.url, fileName: result.filename, fileType: result.mimeType,
      } as Msg])
      wsClient.send("message:send", { conversationId, content: result.url, messageType, attachment, encrypted: "false" })
    } catch {}
    setUploading(false)
  }

  const pickImage = async () => {
    try {
      const result = await (ImagePicker as any).launchImageLibraryAsync({ quality: 0.8 })
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        await uploadAndSend({ uri: file.uri, name: file.fileName || "image.jpg", type: file.mimeType || "image/jpeg" })
      }
    } catch { setUploading(false) }
  }

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        await uploadAndSend({ uri: file.uri, name: file.name, type: file.mimeType })
      }
    } catch { setUploading(false) }
  }

  const showContextMenu = (item: Msg) => {
    const me = item.senderId === user!.id
    const buttons: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [
      { text: "Copy", onPress: () => Clipboard.setStringAsync(decrypted[item.id] || item.content) },
      { text: "Reply", onPress: () => setReplyingTo(item) },
    ]
    if (me) {
      buttons.push({ text: "Edit", onPress: () => { setEditingId(item.id); setEditText(item.content) } })
      buttons.push({ text: "Delete", onPress: () => deleteMsg(item.id), style: "destructive" })
    } else {
      buttons.push({ text: "Report", onPress: () => {
        api("/api/moderation/reports", { method: "POST", body: JSON.stringify({ targetUserId: item.senderId, reason: "Inappropriate message" }) }).catch(() => {})
      }})
    }
    if (!isDeleted) {
      buttons.push({ text: "Add Reaction", onPress: () => setShowReactionPicker(item.id) })
      if (!me) buttons.push({ text: "Pin", onPress: () => pinMessage(item.id) })
    }
    if (item.messageType === "image" || (item.fileUrl && item.fileType?.startsWith("image/"))) {
      buttons.push({ text: "View Image", onPress: () => setPreviewFile(item) })
    }
    buttons.push({ text: "Cancel", style: "cancel" })
    Alert.alert("Message", "", buttons)
  }

  const getMsgContent = (item: Msg) => {
    if (item.deletedAt) return "message deleted"
    return decrypted[item.id] || item.content
  }

  const messagesWithDates = (msgs: Msg[]) => {
    const result: any[] = []
    let lastDate = ""
    msgs.forEach((m) => {
      const d = new Date(m.createdAt)
      const dateKey = d.toLocaleDateString()
      if (dateKey !== lastDate) {
        lastDate = dateKey
        const today = new Date().toLocaleDateString()
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString()
        let label = dateKey
        if (dateKey === today) label = "Today"
        else if (dateKey === yesterday) label = "Yesterday"
        result.push({ _isDate: true, _key: "d_" + dateKey, label })
      }
      result.push(m)
    })
    return result
  }

  const renderMsg = ({ item }: { item: Msg }) => {
    const me = item.senderId === user!.id
    const isDeleted = !!item.deletedAt
    const isEncryptedMsg = item.encrypted === "true" || item.encrypted === true

    return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { if (!isDeleted) setReplyingTo(item) }}
          onLongPress={() => { if (!isDeleted) showContextMenu(item) }}
          style={[mb.bubbleWrap, me ? mb.me : mb.them]}
        >
          <View style={[mb.bubble, me ? mb.bubbleMe : mb.bubbleThem, isDeleted && mb.deletedBubble]}>
            {!me && !isDeleted && <Text style={mb.sender}>{item.sender?.displayName ?? item.sender?.username}</Text>}
            {item.replyTo && !isDeleted && (
              <View style={mb.replyPreview}>
                <Text style={mb.replySender}>{item.replyTo.sender.displayName ?? item.replyTo.sender.username}</Text>
                <Text style={mb.replyContent} numberOfLines={1}>{item.replyTo.content}</Text>
              </View>
            )}
            {isDeleted ? (
              <Text style={mb.deletedText}>message deleted</Text>
            ) : item.messageType === "image" || (item.fileUrl && item.fileType?.startsWith("image/")) ? (
              <TouchableOpacity onPress={() => setPreviewFile(item)}>
                <Image source={{ uri: item.fileUrl || item.attachment?.url }} style={mb.imagePreview} resizeMode="cover" />
              </TouchableOpacity>
            ) : item.messageType === "file" || (item.fileUrl && !item.fileType?.startsWith("image/")) ? (
              <TouchableOpacity onPress={() => setPreviewFile(item)} style={mb.fileRow}>
                <FileText size={14} color={me ? "#FFFFFF" : "#E8E8F0"} />
                <Text style={[mb.msgText, me && mb.msgTextMe]}>{item.fileName || item.attachment?.filename || "File"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {isEncryptedMsg && <Lock size={10} color={me ? "rgba(255,255,255,0.5)" : "#8888A0"} />}
                <Text style={[mb.msgText, me && mb.msgTextMe, { flex: 1 }]}>
                  {isEncryptedMsg && isEncrypted(getMsgContent(item)) ? "Could not decrypt" : getMsgContent(item)}
                </Text>
              </View>
            )}
          {item.reactions && item.reactions.length > 0 && !isDeleted && (
            <View style={mb.reactionRow}>
              {groupReactions(item.reactions).map((r) => (
                <TouchableOpacity key={r.emoji} style={mb.reactionChip} onPress={() => addReaction(item.id, r.emoji)}>
                  <Text style={mb.reactionEmoji}>{r.emoji}</Text>
                  <Text style={mb.reactionCount}>{r.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={mb.metaRow}>
            {msgStatus[item.id] === "sending" && <ActivityIndicator size={8} color={me ? "rgba(255,255,255,0.5)" : "#8888A0"} />}
            <Text style={[mb.time, me && mb.timeMe]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {item.editedAt && !isDeleted && <Text style={[mb.time, me && mb.timeMe]}> edited</Text>}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const groupReactions = (reactions: Reaction[]) => {
    const map = new Map<string, number>()
    reactions.forEach((r) => map.set(r.emoji, (map.get(r.emoji) || 0) + 1))
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }))
  }

  const InfoPanel = () => (
    <Modal visible={showInfo} transparent animationType="slide" onRequestClose={() => setShowInfo(false)}>
      <View style={s.infoOverlay}>
        <View style={s.infoPanel}>
          <View style={s.infoHeader}>
            <Text style={s.infoTitle}>{isDm ? (otherMember?.displayName ?? otherMember?.username ?? "Details") : (convInfo?.name || "Details")}</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)}><X size={20} color="#8888A0" /></TouchableOpacity>
          </View>
          <ScrollView style={s.infoBody}>
            {isDm && otherMember && (
              <>
                {otherMember.avatar ? (
                  <Image source={{ uri: otherMember.avatar }} style={s.infoAvatarImage} />
                ) : (
                  <View style={s.infoAvatar}>
                    <Text style={s.infoAvatarText}>{(otherMember.displayName ?? otherMember.username)[0].toUpperCase()}</Text>
                  </View>
                )}
                <Text style={s.infoName}>{otherMember.displayName ?? otherMember.username}</Text>
                <Text style={s.infoLabel}>User ID: {otherMember.id}</Text>
                <TouchableOpacity style={s.infoAction} onPress={() => Clipboard.setStringAsync(otherMember.id)}>
                  <Copy size={16} color="#6C8CFF" /><Text style={s.infoActionText}> Copy User ID</Text>
                </TouchableOpacity>
                <View style={s.infoDivider} />
                {friendStatus !== "self" && (
                  <TouchableOpacity style={s.infoAction} onPress={friendStatus === "none" ? addFriend : undefined} disabled={friendStatus === "pending"}>
                    <UserPlus size={16} color={friendStatus === "pending" ? "#8888A0" : "#6C8CFF"} />
                    <Text style={[s.infoActionText, friendStatus === "pending" && { color: "#8888A0" }]}>
                      {friendStatus === "pending" ? " Friend Request Pending" : " Add Friend"}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.infoAction} onPress={toggleBlock}>
                  {isBlocked ? <ShieldOff size={16} color="#EF4444" /> : <Ban size={16} color="#EF4444" />}
                  <Text style={[s.infoActionText, { color: "#EF4444" }]}>{isBlocked ? " Unblock User" : " Block User"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.infoAction} onPress={reportUser}>
                  <Flag size={16} color="#EF4444" /><Text style={[s.infoActionText, { color: "#EF4444" }]}> Report User</Text>
                </TouchableOpacity>
                <View style={s.infoDivider} />
                <TouchableOpacity style={s.infoAction} onPress={() => { setShowInfo(false); onBack() }}>
                  <LogOut size={16} color="#EF4444" /><Text style={[s.infoActionText, { color: "#EF4444" }]}> Delete Conversation</Text>
                </TouchableOpacity>
              </>
            )}
            {!isDm && convInfo && (
              <>
                {convInfo.avatar ? (
                  <TouchableOpacity onPress={handleAvatarUpload} style={s.infoAvatar}>
                    <Image source={{ uri: convInfo.avatar }} style={s.infoAvatarImage} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleAvatarUpload} style={s.infoAvatar}>
                    <Text style={s.infoAvatarText}>{(convInfo.name || "G")[0].toUpperCase()}</Text>
                  </TouchableOpacity>
                )}
                {renaming ? (
                  <View style={s.renameRow}>
                    <TextInput style={s.renameInput} value={renameText} onChangeText={setRenameText} onSubmitEditing={renameGroup} autoFocus />
                    <TouchableOpacity style={s.renameSave} onPress={renameGroup}><Text style={s.renameSaveText}>Save</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setRenaming(false)}><Text style={s.renameCancel}>Cancel</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={s.infoAction} onPress={() => { setRenameText(convInfo.name || ""); setRenaming(true) }}>
                    <Edit3 size={16} color="#6C8CFF" /><Text style={s.infoActionText}> Rename Group</Text>
                  </TouchableOpacity>
                )}
                <View style={s.infoDivider} />
                <Text style={s.infoSectionTitle}>Members ({convInfo.members.length})</Text>
                {convInfo.members.map((m) => (
                  <TouchableOpacity key={m.id} style={s.memberRow} onPress={() => navigateToDm(m.id)}>
                    {m.avatar ? (
                      <Image source={{ uri: m.avatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                    ) : (
                      <View style={s.memberAvatar}><Text style={s.memberAvatarText}>{m.username[0].toUpperCase()}</Text></View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>{m.username}</Text>
                      <Text style={s.memberRole}>{m.role}</Text>
                    </View>
                    {m.status && <Text style={{ color: "#585870", fontSize: 10 }}>{m.status}</Text>}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.infoAction} onPress={toggleMute}>
                  {muted ? <BellOff size={16} color="#EF4444" /> : <Bell size={16} color="#8888A0" />}
                  <Text style={[s.infoActionText, { color: muted ? "#EF4444" : "#8888A0" }]}>{muted ? " Unmute" : " Mute"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.infoAction} onPress={() => setShowAddPeople(true)}>
                  <UserPlus size={16} color="#6C8CFF" /><Text style={s.infoActionText}> Add People</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.infoAction} onPress={() => { setShowInfo(false); setShowSearch(true); setSearchQuery(""); setSearchResults([]) }}>
                  <Search size={16} color="#6C8CFF" /><Text style={s.infoActionText}> Search in Conversation</Text>
                </TouchableOpacity>
                <View style={s.infoDivider} />
                <TouchableOpacity style={s.infoAction} onPress={leaveGroup}>
                  <LogOut size={16} color="#EF4444" /><Text style={[s.infoActionText, { color: "#EF4444" }]}> Leave Group</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <ChevronLeft size={24} color="#6C8CFF" />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerCenter} onPress={() => setShowInfo(true)}>
          <Text style={s.title} numberOfLines={1}>{isDm ? (otherMember?.displayName ?? otherMember?.username ?? "User") : (convInfo?.name || "Group")}</Text>
          <Text style={s.subtitle}>
            {typingUsers.length > 0 ? "typing..." : convInfo?.members?.length ? `${convInfo.members.length} members` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.moreBtn} onPress={() => setInCall("voice")}>
          <Phone size={18} color="#8888A0" />
        </TouchableOpacity>
        <TouchableOpacity style={s.moreBtn} onPress={() => setInCall("video")}>
          <Video size={18} color="#8888A0" />
        </TouchableOpacity>
        <TouchableOpacity style={s.moreBtn} onPress={() => setShowMedia(true)}>
          <ImageIcon size={18} color="#8888A0" />
        </TouchableOpacity>
      </View>

      {pinnedMessages.length > 0 && (
        <TouchableOpacity style={s.pinnedBar} onPress={() => setShowPinned(true)}>
          <Pin size={14} color="#6C8CFF" />
          <Text style={s.pinnedText}>{pinnedMessages.length} pinned {pinnedMessages.length === 1 ? "message" : "messages"}</Text>
        </TouchableOpacity>
      )}

      {editingId && (
        <View style={s.editBar}>
          <Text style={s.editLabel}>Editing message</Text>
          <TouchableOpacity onPress={() => setEditingId(null)}><Text style={s.editCancel}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={messagesWithDates(messages)}
        keyExtractor={(m: any) => m.id || m._key}
        contentContainerStyle={s.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }: any) => item._isDate ? (
          <View style={mb.dateSep}>
            <View style={mb.dateSepLine} />
            <Text style={mb.dateSepText}>{item.label}</Text>
            <View style={mb.dateSepLine} />
          </View>
        ) : renderMsg({ item })}
        ListEmptyComponent={<Text style={s.empty}>{t("chat.noMessages")}</Text>}
      />

      {previewFile && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewFile(null)}>
          <View style={s.previewOverlay}>
            <TouchableOpacity style={s.previewClose} onPress={() => setPreviewFile(null)}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={s.previewScrollContent}>
              {previewFile.messageType === "image" || previewFile.fileType?.startsWith("image/") ? (
                <>
                  <Image source={{ uri: previewFile.fileUrl || previewFile.attachment?.url }} style={s.previewImage} resizeMode="contain" />
                  {(previewFile.fileUrl || previewFile.attachment?.url) && (
                    <TouchableOpacity style={s.downloadBtn} onPress={() => Clipboard.setStringAsync(previewFile.fileUrl || previewFile.attachment?.url || "")}>
                      <Text style={s.downloadBtnText}>Copy URL</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={s.previewFile}>
                  <FileText size={48} color="#E8E8F0" />
                  <Text style={s.previewFileText}> {previewFile.fileName || previewFile.attachment?.filename || "File"}</Text>
                  {(previewFile.fileUrl || previewFile.attachment?.url) && (
                    <TouchableOpacity style={s.downloadBtn} onPress={() => Clipboard.setStringAsync(previewFile.fileUrl || previewFile.attachment?.url || "")}>
                      <Text style={s.downloadBtnText}>Copy URL</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {showMedia && mediaItems.length > 0 && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowMedia(false)}>
          <View style={s.mediaOverlay}>
            <View style={s.mediaHeader}>
              <Text style={s.mediaTitle}>Shared Media</Text>
              <TouchableOpacity onPress={() => setShowMedia(false)}><X size={20} color="#8888A0" /></TouchableOpacity>
            </View>
            <FlatList
              data={mediaItems}
              numColumns={3}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.mediaItem} onPress={() => setPreviewFile(item)}>
                  <Image source={{ uri: item.fileUrl || item.attachment?.url }} style={s.mediaThumb} />
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      )}

      {showSearch && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowSearch(false)}>
          <View style={s.mediaOverlay}>
            <View style={s.mediaHeader}>
              <Text style={s.mediaTitle}>Search in Conversation</Text>
              <TouchableOpacity onPress={() => setShowSearch(false)}><X size={20} color="#8888A0" /></TouchableOpacity>
            </View>
            <TextInput
              style={[s.modalInput, { margin: 16, marginBottom: 0 }]}
              placeholder="Search messages..."
              placeholderTextColor="#585870"
              value={searchQuery}
              onChangeText={(v) => {
                setSearchQuery(v)
                if (v.trim().length >= 2) {
                  const local = messages.filter((m) => m.content.toLowerCase().includes(v.toLowerCase()) && !m.deletedAt)
                  setSearchResults(local)
                  api<Msg[]>(`/api/productivity/search?q=${encodeURIComponent(v)}`).then((r) => {
                    const filtered = r.filter((m) => m.conversationId === conversationId)
                    setSearchResults((prev) => {
                      const ids = new Set(prev.map((m) => m.id))
                      const merged = [...prev, ...filtered.filter((m) => !ids.has(m.id))]
                      return merged
                    })
                  }).catch(() => {})
                } else {
                  setSearchResults([])
                }
              }}
              autoFocus
            />
            <FlatList
              data={searchResults}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#252538" }}
                  onPress={() => { setShowSearch(false); setReplyingTo(item); flatRef.current?.scrollToIndex({ index: messages.findIndex((m) => m.id === item.id), animated: true }) }}
                >
                  <Text style={{ color: "#6C8CFF", fontSize: 12, fontWeight: "600", marginBottom: 2 }}>{item.sender?.displayName ?? item.sender?.username}</Text>
                  <Text style={{ color: "#E8E8F0", fontSize: 14 }} numberOfLines={2}>{item.content}</Text>
                  <Text style={{ color: "#585870", fontSize: 11, marginTop: 2 }}>{new Date(item.createdAt).toLocaleString()}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={searchQuery.length >= 2 ? <Text style={{ color: "#585870", textAlign: "center", marginTop: 40, fontSize: 14 }}>No messages found</Text> : null}
            />
          </View>
        </Modal>
      )}

      {showPinned && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowPinned(false)}>
          <View style={s.mediaOverlay}>
            <View style={s.mediaHeader}>
              <Text style={s.mediaTitle}>Pinned Messages ({pinnedMessages.length})</Text>
              <TouchableOpacity onPress={() => setShowPinned(false)}><X size={20} color="#8888A0" /></TouchableOpacity>
            </View>
            <FlatList
              data={pinnedMessages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#252538" }}>
                  <Text style={{ color: "#6C8CFF", fontSize: 12, fontWeight: "600", marginBottom: 2 }}>{item.sender?.displayName ?? item.sender?.username ?? "Unknown"}</Text>
                  <Text style={{ color: "#E8E8F0", fontSize: 14 }}>{item.content}</Text>
                  <TouchableOpacity onPress={() => unpinMessage(item.id)} style={{ marginTop: 4 }}>
                    <Text style={{ color: "#EF4444", fontSize: 12 }}>Unpin</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </Modal>
      )}

      {showReactionPicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowReactionPicker(null)}>
          <TouchableOpacity style={s.reactionOverlay} activeOpacity={1} onPress={() => setShowReactionPicker(null)}>
            <View style={s.reactionPicker}>
              {COMMON_REACTIONS.map((emoji) => (
                <TouchableOpacity key={emoji} style={s.reactionOption} onPress={() => addReaction(showReactionPicker, emoji)}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {replyingTo && !editingId && (
        <View style={s.replyBar}>
          <View style={s.replyBarContent}>
            <Reply size={14} color="#6C8CFF" />
            <View style={{ flex: 1 }}>
              <Text style={s.replyBarLabel}>Replying to {replyingTo.sender.displayName ?? replyingTo.sender.username}</Text>
              <Text style={s.replyBarText} numberOfLines={1}>{replyingTo.content}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}><X size={16} color="#8888A0" /></TouchableOpacity>
        </View>
      )}

      {editingId ? (
        <View style={s.editInputRow}>
          <TextInput
            style={s.editInput}
            value={editText}
            onChangeText={setEditText}
            onSubmitEditing={confirmEdit}
            autoFocus
          />
          <TouchableOpacity style={s.saveBtn} onPress={confirmEdit}><Text style={s.saveText}>Save</Text></TouchableOpacity>
          <TouchableOpacity style={s.cancelEditBtn} onPress={() => setEditingId(null)}><Text style={s.cancelEditText}>Cancel</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={s.inputRow}>
          <TouchableOpacity style={s.attachBtn} onPress={pickImage}><ImageIcon size={20} color="#8888A0" /></TouchableOpacity>
          <TouchableOpacity style={s.attachBtn} onPress={pickFile}><Paperclip size={20} color="#8888A0" /></TouchableOpacity>
          <TouchableOpacity style={s.attachBtn} onPress={() => setShowEmoji(true)}><SmilePlus size={20} color="#8888A0" /></TouchableOpacity>
          <TextInput
            style={s.input}
            placeholder={t("chat.typeMessage")}
            placeholderTextColor="#585870"
            value={input}
            onChangeText={handleInputChange}
            onSubmitEditing={send}
            multiline
          />
          {uploading ? (
            <ActivityIndicator color="#6C8CFF" style={{ marginLeft: 8 }} />
          ) : (
            <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendDisabled]} onPress={send} disabled={!input.trim()}>
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <EmojiPicker visible={showEmoji} onSelect={(emoji) => { setInput((p) => p + emoji) }} onClose={() => setShowEmoji(false)} />
      {inCall && (
        <CallOverlay conversationId={conversationId} type={inCall} onEnd={() => setInCall(null)} />
      )}
      <InfoPanel />
      <AddParticipantsModal
        visible={showAddPeople}
        conversationId={conversationId}
        onClose={() => setShowAddPeople(false)}
      />
    </KeyboardAvoidingView>
  )
}

const mb = StyleSheet.create({
  bubbleWrap: { flexDirection: "row", marginBottom: 4, paddingHorizontal: 12 },
  me: { justifyContent: "flex-end" },
  them: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleMe: { backgroundColor: "#6C8CFF", borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#181825", borderWidth: 1, borderColor: "#252538", borderBottomLeftRadius: 4 },
  deletedBubble: { opacity: 0.4, backgroundColor: "#181825", borderWidth: 1, borderColor: "#252538" },
  deletedText: { color: "#585870", fontSize: 13, fontStyle: "italic", textAlign: "center" },
  sender: { color: "#6C8CFF", fontSize: 11, fontWeight: "600", marginBottom: 2 },
  replyPreview: { borderLeftWidth: 2, borderLeftColor: "#6C8CFF", paddingLeft: 8, marginBottom: 6 },
  replySender: { color: "#6C8CFF", fontSize: 11, fontWeight: "600" },
  replyContent: { color: "#8888A0", fontSize: 12, marginTop: 1 },
  msgText: { color: "#E8E8F0", fontSize: 15, lineHeight: 21 },
  msgTextMe: { color: "#FFFFFF" },
  imagePreview: { width: 200, height: 150, borderRadius: 12, marginVertical: 4 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  reactionChip: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(108,140,255,0.15)", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { color: "#8888A0", fontSize: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  time: { color: "#8888A0", fontSize: 10 },
  timeMe: { color: "rgba(255,255,255,0.5)" },
  dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 12, paddingHorizontal: 12 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: "#252538" },
  dateSepText: { color: "#585870", fontSize: 11, fontWeight: "600", marginHorizontal: 12, textTransform: "uppercase" },
})

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 10,
    paddingTop: Platform.OS === "ios" ? 56 : 10,
    backgroundColor: "#0A0A0F", borderBottomWidth: 1, borderBottomColor: "#181825",
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, marginLeft: 4 },
  title: { color: "#E8E8F0", fontSize: 16, fontWeight: "600" },
  subtitle: { color: "#585870", fontSize: 11, marginTop: 1 },
  moreBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#181825", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#252538", marginLeft: 4 },
  editBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#181825" },
  editLabel: { color: "#6C8CFF", fontSize: 13 },
  editCancel: { color: "#EF4444", fontSize: 13, fontWeight: "500" },
  pinnedBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: "#101016", borderBottomWidth: 1, borderBottomColor: "#252538" },
  pinnedText: { color: "#6C8CFF", fontSize: 12 },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#181825", borderTopWidth: 1, borderTopColor: "#252538", gap: 8 },
  replyBarContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  replyBarLabel: { color: "#6C8CFF", fontSize: 11, fontWeight: "600" },
  replyBarText: { color: "#8888A0", fontSize: 12, marginTop: 1 },
  msgList: { paddingVertical: 8, paddingBottom: 16 },
  empty: { color: "#585870", textAlign: "center", marginTop: 60, fontSize: 15 },
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  previewClose: { position: "absolute", top: Platform.OS === "ios" ? 56 : 20, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  previewImage: { width: "100%", height: 400 },
  previewScrollContent: { alignItems: "center", paddingVertical: 40 },
  previewFile: { padding: 40, backgroundColor: "#181825", borderRadius: 20, alignItems: "center" },
  previewFileText: { color: "#E8E8F0", fontSize: 16 },
  mediaOverlay: { flex: 1, backgroundColor: "#0A0A0F", paddingTop: Platform.OS === "ios" ? 56 : 20 },
  mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#252538" },
  mediaTitle: { color: "#E8E8F0", fontSize: 17, fontWeight: "600" },
  mediaItem: { flex: 1, aspectRatio: 1, padding: 2 },
  mediaThumb: { flex: 1, borderRadius: 8 },
  reactionOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  reactionPicker: { flexDirection: "row", backgroundColor: "#101016", borderRadius: 24, padding: 12, gap: 8, borderWidth: 1, borderColor: "#252538" },
  reactionOption: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#181825", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#252538" },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#181825", gap: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: "#101016", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: "#E8E8F0", fontSize: 15, borderWidth: 1, borderColor: "#252538" },
  attachBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#6C8CFF", justifyContent: "center", alignItems: "center" },
  sendDisabled: { opacity: 0.4 },
  editInputRow: { flexDirection: "row", alignItems: "center", padding: 10, borderTopWidth: 1, borderTopColor: "#252538", gap: 6 },
  editInput: { flex: 1, backgroundColor: "#101016", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, color: "#E8E8F0", fontSize: 15, borderWidth: 1, borderColor: "#252538" },
  saveBtn: { backgroundColor: "#22C55E", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  cancelEditBtn: { padding: 8 },
  cancelEditText: { color: "#8888A0", fontSize: 13 },
  downloadBtn: { backgroundColor: "#6C8CFF", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  downloadBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  infoOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  infoPanel: { backgroundColor: "#0A0A0F", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", borderTopWidth: 1, borderTopColor: "#252538" },
  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#252538" },
  infoTitle: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  infoBody: { padding: 20 },
  infoAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#181825", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 12, borderWidth: 1, borderColor: "#252538" },
  infoAvatarImage: { width: 64, height: 64, borderRadius: 32, alignSelf: "center", marginBottom: 12 },
  infoAvatarText: { color: "#E8E8F0", fontSize: 28, fontWeight: "600" },
  infoName: { color: "#E8E8F0", fontSize: 20, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  infoLabel: { color: "#585870", fontSize: 12, textAlign: "center", marginBottom: 16 },
  infoAction: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 8 },
  infoActionText: { color: "#6C8CFF", fontSize: 15 },
  infoDivider: { height: 1, backgroundColor: "#252538", marginVertical: 8 },
  infoSectionTitle: { color: "#8888A0", fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginTop: 12, marginBottom: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#181825", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#252538" },
  memberAvatarText: { color: "#E8E8F0", fontSize: 14, fontWeight: "600" },
  memberName: { color: "#E8E8F0", fontSize: 14, flex: 1 },
  memberRole: { color: "#585870", fontSize: 11, textTransform: "capitalize" },
  renameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  renameInput: { flex: 1, backgroundColor: "#101016", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: "#E8E8F0", fontSize: 14, borderWidth: 1, borderColor: "#252538" },
  renameSave: { backgroundColor: "#22C55E", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  renameSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  renameCancel: { color: "#8888A0", fontSize: 13 },
  modalInput: { backgroundColor: "#101016", borderRadius: 12, padding: 14, color: "#E8E8F0", fontSize: 15, borderWidth: 1, borderColor: "#252538" },
})
