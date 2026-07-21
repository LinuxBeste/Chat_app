import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { Plus, X, Calendar, Clock } from "lucide-react"

interface Event {
  id: string
  conversationId: string
  createdBy: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  createdAt: string
  rsvps?: { userId: string; status: string }[]
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selected, setSelected] = useState<Event | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [myRsvp, setMyRsvp] = useState<string | null>(null)

  useEffect(() => {
    api<Event[]>("/api/events")
      .then(setEvents)
      .catch(() => {})
  }, [])

  const selectEvent = async (e: Event) => {
    setSelected(e)
    const data = await api<Event>(`/api/events/${e.id}`).catch(() => null)
    if (data) {
      setSelected(data)
      const me = localStorage.getItem("userId")
      const my = data.rsvps?.find((r) => r.userId === me)
      setMyRsvp(my?.status ?? null)
    }
  }

  const createEvent = async () => {
    if (!title.trim() || !startsAt) return
    const e = await api<Event>("/api/events", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "00000000-0000-0000-0000-000000000000",
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      }),
    }).catch(() => null)
    if (e) {
      setEvents((prev) => [e, ...prev])
      setTitle("")
      setDescription("")
      setStartsAt("")
      setEndsAt("")
      setShowCreate(false)
    }
  }

  const rsvp = async (status: string) => {
    if (!selected) return
    await api(`/api/events/${selected.id}/rsvp`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }).catch(() => {})
    setMyRsvp(status)
    selectEvent(selected)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const rsvpCount = (status: string) => selected?.rsvps?.filter((r) => r.status === status).length ?? 0

  const upcoming = events.filter((e) => new Date(e.startsAt) > new Date())
  const past = events.filter((e) => new Date(e.startsAt) <= new Date())

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Events</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Create event"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {upcoming.length > 0 && (
            <div className="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">Upcoming</div>
          )}
          {upcoming.map((e) => (
            <button
              key={e.id}
              onClick={() => selectEvent(e)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer hover:bg-white/[0.02] ${selected?.id === e.id ? "bg-accent/[0.03]" : ""}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{e.title}</p>
                <p className="text-xs text-text-muted">{formatDate(e.startsAt)}</p>
              </div>
            </button>
          ))}
          {past.length > 0 && (
            <div className="px-4 py-2 mt-2 text-xs font-medium text-text-muted uppercase tracking-wider">Past</div>
          )}
          {past.map((e) => (
            <button
              key={e.id}
              onClick={() => selectEvent(e)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer hover:bg-white/[0.02] ${selected?.id === e.id ? "bg-accent/[0.03]" : ""}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-text-muted shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{e.title}</p>
                <p className="text-xs text-text-muted">{formatDate(e.startsAt)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selected && <p className="text-sm text-text-muted">Select an event or create one</p>}
        {selected && (
          <div className="max-w-lg space-y-6">
            <h1 className="text-lg font-semibold text-text-primary">{selected.title}</h1>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(selected.startsAt)}</span>
              </div>
              {selected.endsAt && (
                <div className="flex items-center gap-3 text-sm text-text-muted">
                  <Clock className="h-4 w-4" />
                  <span>Ends {formatDate(selected.endsAt)}</span>
                </div>
              )}
              {selected.description && (
                <p className="text-sm text-text-primary bg-surface border border-border rounded-2xl p-4">
                  {selected.description}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">RSVP</h3>
              <div className="flex gap-2">
                {["going", "maybe", "declined"].map((s) => (
                  <button
                    key={s}
                    onClick={() => rsvp(s)}
                    className={`flex-1 h-10 rounded-2xl text-sm font-medium transition-all cursor-pointer capitalize ${
                      myRsvp === s
                        ? "bg-accent text-white"
                        : "border border-border bg-surface text-text-secondary hover:border-accent/30"
                    }`}
                  >
                    {s} ({rsvpCount(s)})
                  </button>
                ))}
              </div>
            </div>

            {selected.rsvps && selected.rsvps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-primary mb-2">Responses ({selected.rsvps.length})</h3>
                <div className="space-y-1.5">
                  {["going", "maybe", "declined"].map((s) => {
                    const filtered = selected.rsvps!.filter((r) => r.status === s)
                    if (filtered.length === 0) return null
                    return (
                      <div key={s} className="rounded-2xl border border-border bg-surface px-4 py-2.5">
                        <span className="text-xs text-text-muted capitalize">
                          {s} — {filtered.length}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Create Event</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-2xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 resize-none"
              />
              <div>
                <label className="text-xs text-text-muted block mb-1">Starts</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Ends (optional)</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary outline-none focus:border-accent/50"
                />
              </div>
              <button
                onClick={createEvent}
                disabled={!title.trim() || !startsAt}
                className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
