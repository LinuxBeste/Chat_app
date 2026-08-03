import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { wsClient } from "../lib/ws"
import { Mic, MicOff, LogOut } from "lucide-react-native"
import { useTheme } from "../lib/theme-context"

interface VoiceChannelProps {
  channelId: string
  channelName: string
  onLeave: () => void
}

export function VoiceChannel({ channelId, channelName, onLeave }: VoiceChannelProps) {
  const { c } = useTheme()
  const [muted, setMuted] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])

  useEffect(() => {
    wsClient.send("voice:join", { channelId })
    const unsub1 = wsClient.on("voice:user-joined", (data: any) => {
      if (data.channelId === channelId) setParticipants((p) => [...p, data.userId])
    })
    const unsub2 = wsClient.on("voice:user-left", (data: any) => {
      if (data.channelId === channelId) setParticipants((p) => p.filter((id) => id !== data.userId))
    })
    return () => {
      unsub1()
      unsub2()
      wsClient.send("voice:leave", { channelId })
    }
  }, [channelId])

  const toggleMute = () => {
    setMuted(!muted)
  }

  const leave = () => {
    wsClient.send("voice:leave", { channelId })
    onLeave()
  }

  return (
    <View style={[s.container, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: c.text }]}>{channelName}</Text>
        <TouchableOpacity onPress={leave} style={[s.leaveBtn, { backgroundColor: c.danger }]}>
          <LogOut size={16} color="#FFFFFF" />
          <Text style={s.leaveText}> Leave</Text>
        </TouchableOpacity>
      </View>
      <View style={s.controls}>
        <TouchableOpacity
          style={[s.controlBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }, muted && s.active]}
          onPress={toggleMute}
        >
          {muted ? <MicOff size={20} color={c.text} /> : <Mic size={20} color={c.text} />}
          <Text style={[s.controlText, { color: c.text }]}> {muted ? "Muted" : "Unmuted"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[s.participants, { color: c.textMuted }]}>{participants.length} in channel</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    margin: 16,
    borderWidth: 1,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "600" },
  leaveBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  leaveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  controls: { flexDirection: "row", gap: 12, marginBottom: 12 },
  controlBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  active: { borderColor: "#22C55E", backgroundColor: "rgba(34,197,94,0.1)" },
  controlText: { fontSize: 14 },
  participants: { fontSize: 12, textAlign: "center" },
})
