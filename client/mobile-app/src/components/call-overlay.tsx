import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react-native"
import { wsClient } from "../lib/ws"

interface CallOverlayProps {
  conversationId: string
  type: "voice" | "video"
  onEnd: () => void
  incoming?: boolean
}

export function CallOverlay({ conversationId, type, onEnd, incoming }: CallOverlayProps) {
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(type === "video")
  const [duration, setDuration] = useState(0)
  const [connected, setConnected] = useState(!incoming)

  useEffect(() => {
    if (!incoming) {
      wsClient.send("call:offer", { conversationId, type })
    }
    const unsub1 = wsClient.on("call:answered", () => setConnected(true))
    const unsub2 = wsClient.on("call:ended", (data: any) => {
      if (data.sessionId === conversationId) onEnd()
    })
    const timer = setInterval(() => setDuration((d) => d + 1), 1000)
    return () => { unsub1(); unsub2(); clearInterval(timer) }
  }, [conversationId])

  const endCall = () => {
    wsClient.send("call:end", { sessionId: conversationId })
    onEnd()
  }

  const answerCall = () => {
    wsClient.send("call:answer", { conversationId })
    setConnected(true)
  }

  const toggleMute = () => setMuted(!muted)
  const toggleVideo = () => setVideoOn(!videoOn)

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <View style={s.container}>
      <View style={s.titleRow}>
        {type === "video" ? <Video size={24} color="#E8E8F0" /> : <Phone size={24} color="#E8E8F0" />}
        <Text style={s.title}> {incoming && !connected ? "Incoming call..." : connected ? formatDuration(duration) : "Ringing..."}</Text>
      </View>
      <View style={s.controls}>
        {incoming && !connected ? (
          <>
            <TouchableOpacity style={[s.btn, s.answerBtn]} onPress={answerCall}>
              <Phone size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.endBtn]} onPress={endCall}>
              <PhoneOff size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[s.btn, muted && s.activeBtn]} onPress={toggleMute}>
              {muted ? <MicOff size={24} color="#E8E8F0" /> : <Mic size={24} color="#E8E8F0" />}
            </TouchableOpacity>
            {type === "video" && (
              <TouchableOpacity style={[s.btn, !videoOn && s.activeBtn]} onPress={toggleVideo}>
                {videoOn ? <Video size={24} color="#E8E8F0" /> : <VideoOff size={24} color="#E8E8F0" />}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btn, s.endBtn]} onPress={endCall}>
              <PhoneOff size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  title: { color: "#E8E8F0", fontSize: 20, fontWeight: "600" },
  controls: { flexDirection: "row", gap: 24, alignItems: "center" },
  btn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#181825", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#252538" },
  activeBtn: { backgroundColor: "rgba(239,68,68,0.3)", borderColor: "#EF4444" },
  endBtn: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  answerBtn: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
})
