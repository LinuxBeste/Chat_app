import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { wsClient } from "../lib/ws"
import { Mic, MicOff, LogOut } from "lucide-react-native"

interface VoiceChannelProps {
  channelId: string
  channelName: string
  onLeave: () => void
}

export function VoiceChannel({ channelId, channelName, onLeave }: VoiceChannelProps) {
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
    return () => { unsub1(); unsub2(); wsClient.send("voice:leave", { channelId }) }
  }, [channelId])

  const toggleMute = () => {
    setMuted(!muted)
  }

  const leave = () => {
    wsClient.send("voice:leave", { channelId })
    onLeave()
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{channelName}</Text>
        <TouchableOpacity onPress={leave} style={s.leaveBtn}>
          <LogOut size={16} color="#FFFFFF" />
          <Text style={s.leaveText}> Leave</Text>
        </TouchableOpacity>
      </View>
      <View style={s.controls}>
        <TouchableOpacity style={[s.controlBtn, muted && s.active]} onPress={toggleMute}>
          {muted ? <MicOff size={20} color="#E8E8F0" /> : <Mic size={20} color="#E8E8F0" />}
          <Text style={s.controlText}> {muted ? "Muted" : "Unmuted"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.participants}>{participants.length} in channel</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { backgroundColor: "#101016", borderRadius: 20, padding: 20, margin: 16, borderWidth: 1, borderColor: "#252538" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  leaveBtn: { backgroundColor: "#EF4444", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  leaveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  controls: { flexDirection: "row", gap: 12, marginBottom: 12 },
  controlBtn: { backgroundColor: "#181825", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: "#252538" },
  active: { borderColor: "#22C55E", backgroundColor: "rgba(34,197,94,0.1)" },
  controlText: { color: "#E8E8F0", fontSize: 14 },
  participants: { color: "#585870", fontSize: 12, textAlign: "center" },
})
