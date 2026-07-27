import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react"
import { wsClient } from "../../lib/ws"

interface CallOverlayProps {
  conversationId: string
  targetUserId: string
  direction: "incoming" | "outgoing"
  onEnd: () => void
}

export function CallOverlay({ conversationId, targetUserId, direction, onEnd }: CallOverlayProps) {
  const { t } = useTranslation()
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [duration, setDuration] = useState(0)
  const [connected, setConnected] = useState(false)
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
    pcRef.current = pc

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsClient.send("call:ice-candidate", { sessionId: sessionIdRef.current, candidate: e.candidate.toJSON() })
      }
    }

    pc.ontrack = (e) => {
      if (remoteRef.current) remoteRef.current.srcObject = e.streams[0]
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setConnected(true)
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") onEnd()
    }

    return () => {
      pc.close()
      clearInterval(timerRef.current)
    }
  }, [conversationId, onEnd])

  const startCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    if (localRef.current) localRef.current.srcObject = stream
    stream.getTracks().forEach((t) => pcRef.current?.addTrack(t, stream))

    const offer = await pcRef.current!.createOffer()
    await pcRef.current!.setLocalDescription(offer)
    wsClient.send("call:offer", { targetUserId, conversationId, sdp: offer })

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
  }, [targetUserId, conversationId])

  useEffect(() => {
    if (direction === "outgoing") startCall()
  }, [direction, startCall])

  const answerCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    if (localRef.current) localRef.current.srcObject = stream
    stream.getTracks().forEach((t) => pcRef.current?.addTrack(t, stream))

    const answer = await pcRef.current!.createAnswer()
    await pcRef.current!.setLocalDescription(answer)
    wsClient.send("call:answer", { sessionId: sessionIdRef.current, sdp: answer })

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
  }, [conversationId])

  useEffect(() => {
    const unsubOffer = wsClient.on("call:offer", async (data) => {
      sessionIdRef.current = data.sessionId as string
      if (data.conversationId === conversationId) {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.sdp as RTCSessionDescriptionInit))
      }
    })
    const unsubAnswer = wsClient.on("call:answer", async (data) => {
      if (data.sessionId === sessionIdRef.current) {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.sdp as RTCSessionDescriptionInit))
      }
    })
    const unsubIce = wsClient.on("call:ice-candidate", async (data) => {
      if (data.sessionId === sessionIdRef.current) {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate as RTCIceCandidateInit))
      }
    })
    return () => {
      unsubOffer()
      unsubAnswer()
      unsubIce()
    }
  }, [conversationId])

  const endCall = () => {
    pcRef.current?.close()
    clearInterval(timerRef.current)
    wsClient.send("call:end", { sessionId: sessionIdRef.current })
    onEnd()
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary"
      role="dialog"
      aria-label={t("calls.callControls")}
      aria-live="polite"
    >
      <div className="flex-1 relative">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          aria-label={t("calls.remoteVideo")}
        />
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-6 right-6 w-40 h-28 rounded-2xl object-cover border-2 border-border"
          aria-label={t("calls.yourVideo")}
        />
      </div>

      <div className="flex items-center justify-center gap-4 p-6 bg-bg-secondary">
        <p className="text-sm text-text-muted mr-4" aria-live="polite">
          {direction === "incoming"
            ? t("calls.incomingCall")
            : connected
              ? formatTime(duration)
              : t("calls.connecting")}
        </p>
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? t("calls.unmuteMic") : t("calls.muteMic")}
          aria-pressed={muted}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-text-secondary hover:text-text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {muted ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
        </button>
        <button
          onClick={() => setVideoOff(!videoOff)}
          aria-label={videoOff ? t("calls.turnOnVideo") : t("calls.turnOffVideo")}
          aria-pressed={videoOff}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-text-secondary hover:text-text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {videoOff ? (
            <VideoOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Video className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        {direction === "incoming" && !connected && (
          <button
            onClick={answerCall}
            aria-label={t("calls.answerCall")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Phone className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        <button
          onClick={endCall}
          aria-label={t("calls.endCall")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <PhoneOff className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
