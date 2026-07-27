import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { api } from "../lib/api"
import { wsClient } from "../lib/ws"

interface Msg {
  id: string
  content: string
  senderId: string
  createdAt: string
  sender: { username: string }
}

export function ChatScreen({
  conversationId,
  userId,
  onBack,
}: {
  conversationId: string
  userId: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const flatRef = useRef<FlatList>(null)

  useEffect(() => {
    api<Msg[]>(`/api/conversations/${conversationId}/messages`)
      .then(setMessages)
      .catch(() => {})
  }, [conversationId])

  useEffect(() => {
    const unsub = wsClient.on("message:new", (data) => {
      if (data.conversationId === conversationId) setMessages((p) => [...p, data as unknown as Msg])
    })
    return () => {
      unsub()
    }
  }, [conversationId])

  const send = () => {
    if (!input.trim()) return
    wsClient.send("message:send", { conversationId, content: input.trim() })
    setInput("")
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.back}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Chat</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const me = item.senderId === userId
          return (
            <View style={[s.bubbleWrap, me ? s.me : s.them]}>
              <View style={[s.bubble, me ? s.bubbleMe : s.bubbleThem]}>
                <Text style={[s.msgText, me && s.msgTextMe]}>{item.content}</Text>
                <Text style={[s.time, me && s.timeMe]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          )
        }}
      />
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor="#5C6068"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
        />
        <TouchableOpacity style={s.sendBtn} onPress={send} disabled={!input.trim()}>
          <Text style={s.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1116" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2F3A",
  },
  back: { color: "#4850BB", fontSize: 14 },
  title: { color: "#F0F0F0", fontSize: 16, fontWeight: "600" },
  bubbleWrap: { flexDirection: "row", marginBottom: 8 },
  me: { justifyContent: "flex-end" },
  them: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: "#4850BB", borderBottomRightRadius: 6 },
  bubbleThem: { backgroundColor: "#181B22", borderWidth: 1, borderColor: "#2A2F3A", borderBottomLeftRadius: 6 },
  msgText: { color: "#F0F0F0", fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: "#FFFFFF" },
  time: { color: "#8B8F96", fontSize: 11, marginTop: 4 },
  timeMe: { color: "rgba(255,255,255,0.6)" },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: 1, borderTopColor: "#2A2F3A" },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: "#181B22",
    borderRadius: 20,
    paddingHorizontal: 16,
    color: "#F0F0F0",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2A2F3A",
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#4850BB",
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 40,
    justifyContent: "center",
  },
  sendText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
})
