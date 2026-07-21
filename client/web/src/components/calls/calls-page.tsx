import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from "lucide-react"

interface Call {
  id: string
  callerId: string
  calleeId: string
  status: string
  duration: number | null
  createdAt: string
}

export function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])

  useEffect(() => {
    api<Call[]>("/api/calls")
      .then(setCalls)
      .catch(() => {})
  }, [])

  const myId = localStorage.getItem("userId")

  const formatDuration = (sec: number | null) => {
    if (!sec) return null
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Recent Calls</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {calls.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-text-muted">
              <Phone className="h-8 w-8" />
              <p className="text-sm">No call history</p>
            </div>
          )}
          {calls.map((call) => {
            const incoming = call.calleeId === myId
            const missed = call.status !== "ended"
            return (
              <div key={call.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                    missed && incoming ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
                  }`}
                >
                  {incoming ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{incoming ? "Incoming" : "Outgoing"}</p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{formatTime(call.createdAt)}</span>
                    {call.duration && (
                      <>
                        <span>·</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(call.duration)}</span>
                      </>
                    )}
                  </div>
                </div>
                {missed && incoming && <span className="text-xs text-danger font-medium">Missed</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
