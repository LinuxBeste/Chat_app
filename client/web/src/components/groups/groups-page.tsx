import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { Plus, Users, X } from "lucide-react"

interface Group {
  id: string
  type: string
  name: string | null
  createdAt: string
}

interface Member {
  id: string
  username: string
  displayName: string | null
  role: string
}

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")

  useEffect(() => {
    api<Group[]>("/api/conversations").then((convs) => {
      setGroups(convs.filter((c) => c.type === "group"))
    }).catch(() => {})
  }, [])

  const selectGroup = async (g: Group) => {
    setSelected(g)
    setNewName(g.name ?? "")
    const conv = await api<any>(`/api/conversations/${g.id}`)
    setMembers(conv.members ?? [])
  }

  const renameGroup = async () => {
    if (!selected || !newName.trim()) return
    await api(`/api/conversations/${selected.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName.trim() }),
    }).catch(() => {})
    setGroups((prev) => prev.map((g) => g.id === selected.id ? { ...g, name: newName.trim() } : g))
    setSelected((prev) => prev ? { ...prev, name: newName.trim() } : null)
  }

  const createGroup = async () => {
    if (!createName.trim()) return
    const conv = await api<Group>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "group", name: createName.trim(), participantIds: [] }),
    }).catch(() => null)
    if (conv) {
      setGroups((prev) => [conv, ...prev])
      setCreateName("")
      setShowCreate(false)
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Groups</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Create group"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => selectGroup(g)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer hover:bg-white/[0.02] ${selected?.id === g.id ? "bg-accent/[0.03]" : ""}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{g.name ?? "Unnamed"}</p>
                <p className="text-xs text-text-muted">{g.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selected && (
          <p className="text-sm text-text-muted">Select a group to manage</p>
        )}
        {selected && (
          <div className="max-w-lg space-y-6">
            <h1 className="text-lg font-semibold text-text-primary">Group Settings</h1>

            <div>
              <label className="text-xs text-text-muted block mb-1">Group Name</label>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 h-10 rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/50"
                />
                <button
                  onClick={renameGroup}
                  disabled={!newName.trim()}
                  className="h-10 rounded-2xl bg-accent text-white text-sm px-4 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                >
                  Rename
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">Members ({members.length})</h3>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                      {(m.displayName || m.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{m.displayName || m.username}</p>
                      <p className="text-xs text-text-muted">@{m.username}</p>
                    </div>
                    <span className="text-xs text-text-muted capitalize bg-bg-primary rounded-xl px-2.5 py-1">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Create Group</h3>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Group name"
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 mb-4"
            />
            <button
              onClick={createGroup}
              disabled={!createName.trim()}
              className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
