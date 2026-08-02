import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native"
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX, User } from "lucide-react-native"
import { wsClient } from "../lib/ws"

interface CallOverlayProps {
  conversationId: string
  type: "voice" | "video"
  onEnd: () => void
  incoming?: boolean
  name?: string
  avatar?: string | null
}

const AVATAR_COLORS = ["#E5A13C", "#38B7DE", "#E542A3", "#1FA855", "#C484FF", "#F27F2F", "#3FC8B4", "#5B9BD5"]

function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function CallOverlay({ conversationId, type, onEnd, incoming, name, avatar }: CallOverlayProps) {
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(type === "video")
  const [speakerOn, setSpeakerOn] = useState(true)
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
    return () => {
      unsub1()
      unsub2()
      clearInterval(timer)
    }
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
  const toggleSpeaker = () => setSpeakerOn(!speakerOn)

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const displayName = name || "Call"
  const avatarBg = colorFor(displayName)

  const statusText = incoming && !connected ? "Incoming call..." : connected ? formatDuration(duration) : "Ringing..."

  return (
    <View style={s.container}>
      <View style={s.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.avatarImage} />
        ) : (
          <View style={[s.avatar, { backgroundColor: avatarBg }]}>
            <Text style={s.avatarText}>{(displayName[0] || "?").toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={s.name}>{displayName}</Text>
      <View style={s.statusRow}>
        {type === "video" ? <Video size={16} color="#8696A0" /> : <Phone size={16} color="#8696A0" />}
        <Text style={s.status}>{statusText}</Text>
      </View>

      <View style={s.controls}>
        {incoming && !connected ? (
          <>
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, s.endBtn]} onPress={endCall}>
                <PhoneOff size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>Decline</Text>
            </View>
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, s.answerBtn]} onPress={answerCall}>
                <Phone size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>Accept</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, muted && s.activeBtn]} onPress={toggleMute}>
                {muted ? <MicOff size={24} color="#E8E8F0" /> : <Mic size={24} color="#E8E8F0" />}
              </TouchableOpacity>
              <Text style={s.btnLabel}>{muted ? "Unmute" : "Mute"}</Text>
            </View>
            {type === "video" && (
              <View style={s.controlCol}>
                <TouchableOpacity style={[s.btn, !videoOn && s.activeBtn]} onPress={toggleVideo}>
                  {videoOn ? <Video size={24} color="#E8E8F0" /> : <VideoOff size={24} color="#E8E8F0" />}
                </TouchableOpacity>
                <Text style={s.btnLabel}>{videoOn ? "Video" : "Off"}</Text>
              </View>
            )}
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, s.endBtn]} onPress={endCall}>
                <PhoneOff size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>End</Text>
            </View>
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, !speakerOn && s.activeBtn]} onPress={toggleSpeaker}>
                {speakerOn ? <Volume2 size={24} color="#E8E8F0" /> : <VolumeX size={24} color="#E8E8F0" />}
              </TouchableOpacity>
              <Text style={s.btnLabel}>{speakerOn ? "Speaker" : "Muted"}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(7,12,16,0.97)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  avatarWrap: { marginBottom: 20 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 112, height: 112, borderRadius: 56 },
  avatarText: { color: "#FFFFFF", fontSize: 44, fontWeight: "700" },
  name: { color: "#E9EDEF", fontSize: 22, fontWeight: "600", marginBottom: 10 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 64 },
  status: { color: "#8696A0", fontSize: 16 },
  controls: { flexDirection: "row", gap: 28, alignItems: "center" },
  controlCol: { alignItems: "center", gap: 8 },
  btnLabel: { color: "#8696A0", fontSize: 12 },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1F2C34",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  activeBtn: { backgroundColor: "rgba(239,68,68,0.25)", borderColor: "#EF4444" },
  endBtn: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  answerBtn: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
})
