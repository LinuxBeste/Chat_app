import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"

export function ProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ displayName: string | null; bio?: string }>("/api/users/me")
      .then((u) => {
        setDisplayName(u.displayName ?? "")
        setBio(u.bio ?? "")
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ displayName, bio }),
      })
    } catch {}
    setSaving(false)
  }

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-8">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-lg font-semibold text-text-primary">Profile</h1>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white text-xl font-bold shrink-0">
            {(displayName || user?.username)?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{user?.username}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display Name"
              className="w-full h-10 rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
