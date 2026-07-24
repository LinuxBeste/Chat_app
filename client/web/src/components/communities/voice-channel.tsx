import { useState, useEffect, useCallback, useRef } from "react"
import { wsClient } from "../../lib/ws"
import { Headphones, Mic, MicOff, PhoneOff } from "lucide-react"
import { useTranslation } from "react-i18next"

interface Participant {
  userId: string
}

interface VoiceChannelProps {
  channelId: string
  channelName: string
  onLeave: () => void
}

export function VoiceChannel({ channelId, channelName, onLeave }: VoiceChannelProps) {
  const { t } = useTranslation()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [muted, setMuted] = useState(false)
  const [joined, setJoined] = useState(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  useEffect(() => {
    const unsubs: (() => void)[] = []

    unsubs.push(
      wsClient.on("voice:joined", (data: any) => {
        if (data.channelId === channelId) {
          setJoined(true)
          setParticipants(
            (data.participants as string[]).map((id: string) => ({ userId: id }))
          )
        }
      }),
    )

    unsubs.push(
      wsClient.on("voice:user-joined", (data: any) => {
        if (data.channelId === channelId) {
          setParticipants(
            (data.participants as string[]).map((id: string) => ({ userId: id }))
          )
        }
      }),
    )

    unsubs.push(
      wsClient.on("voice:user-left", (data: any) => {
        if (data.channelId === channelId) {
          setParticipants(
            (data.participants as string[]).map((id: string) => ({ userId: id }))
          )
        }
      }),
    )

    unsubs.push(
      wsClient.on("voice:offer", async (data: any) => {
        if (data.channelId !== channelId) return
        const pc = createPeerConnection(data.callerId)
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        wsClient.send("voice:answer", {
          channelId,
          targetUserId: data.callerId,
          sdp: pc.localDescription,
        })
      }),
    )

    unsubs.push(
      wsClient.on("voice:answer", async (data: any) => {
        if (data.channelId !== channelId) return
        const pc = peerConnectionsRef.current.get(data.userId)
        if (pc && pc.remoteDescription === null) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        }
      }),
    )

    unsubs.push(
      wsClient.on("voice:ice-candidate", async (data: any) => {
        if (data.channelId !== channelId) return
        const pc = peerConnectionsRef.current.get(data.userId)
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      }),
    )

    wsClient.send("voice:join", { channelId })

    return () => {
      unsubs.forEach((fn) => fn())
      cleanupConnections()
    }
  }, [channelId])

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const existing = peerConnectionsRef.current.get(targetUserId)
      if (existing) existing.close()

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          wsClient.send("voice:ice-candidate", {
            channelId,
            targetUserId,
            candidate: e.candidate,
          })
        }
      }

      pc.ontrack = (e) => {
        const existingAudio = audioElementsRef.current.get(targetUserId)
        if (existingAudio) existingAudio.remove()

        const audio = new Audio()
        audio.srcObject = e.streams[0]
        audio.autoplay = true
        audioElementsRef.current.set(targetUserId, audio)
      }

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current)
        }
      }

      peerConnectionsRef.current.set(targetUserId, pc)
      return pc
    },
    [channelId],
  )

  const cleanupConnections = () => {
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    audioElementsRef.current.forEach((audio) => audio.remove())
    audioElementsRef.current.clear()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
  }

  const handleLeave = () => {
    cleanupConnections()
    wsClient.send("voice:leave", { channelId })
    setJoined(false)
    setParticipants([])
    onLeave()
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = muted
      })
    }
    setMuted(!muted)
  }

  useEffect(() => {
    return () => {
      if (joined) {
        wsClient.send("voice:leave", { channelId })
      }
    }
  }, [])

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg">
        <Headphones className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-text-primary">{channelName}</span>
        <span className="text-xs text-text-muted">
          {participants.length} {t("voice.participants")}
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          {participants
            .filter((p) => p.userId !== "self")
            .slice(0, 5)
            .map((p) => (
              <div
                key={p.userId}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent"
                title={p.userId}
              >
                {p.userId.slice(0, 2).toUpperCase()}
              </div>
            ))}
          {participants.length > 6 && (
            <span className="text-xs text-text-muted">+{participants.length - 5}</span>
          )}
        </div>
        <button
          onClick={toggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/5 transition-all cursor-pointer"
          aria-label={muted ? t("voice.unmute") : t("voice.mute")}
        >
          {muted ? <MicOff className="h-4 w-4 text-danger" /> : <Mic className="h-4 w-4 text-text-primary" />}
        </button>
        <button
          onClick={handleLeave}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-all cursor-pointer"
          aria-label={t("voice.leave")}
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
