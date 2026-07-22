import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { Plus, Users, X, Search, UserCheck } from "lucide-react"

interface Group {
  id: string
  type: string
  name: string | null
  createdAt: string
  createdBy: string
}

interface Member {
  id: string
  username: string
  displayName: string | null
  role: string
}

interface UserResult {
  id: string
  username: string
  displayName: string | null
}

export function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserResult[]>([])

  useEffect(() => {
    api<Group[]>("/api/conversations")
      .then((convs) => {
        setGroups(convs.filter((c) => c.type === "group"))
      })
      .catch(() => {})
  }, [])

  const selectGroup = async (g: Group) => {
    setSelected(g)
    setNewName(g.name ?? "")
    const conv = await api<any>(`/api/conversations/${g.id}`)
    setMembers(conv.members ?? [])
  }

  const currentMember = members.find((m) => m.id === user?.id)
  const isOwner = currentMember?.role === "owner"
  const isAdmin = currentMember?.role === "admin"
  const canManage = isOwner || isAdmin

  const renameGroup = async () => {
    if (!selected || !newName.trim()) return
    await api(`/api/conversations/${selected.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName.trim() }),
    }).catch(() => {})
    setGroups((prev) => prev.map((g) => (g.id === selected.id ? { ...g, name: newName.trim() } : g)))
    setSelected((prev) => (prev ? { ...prev, name: newName.trim() } : null))
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

  const removeMember = async (userId: string) => {
    if (!selected) return
    await api(`/api/conversations/${selected.id}/participants/${userId}`, {
      method: "DELETE",
    }).catch(() => {})
    setMembers((prev) => prev.filter((m) => m.id !== userId))
  }

  const changeRole = async (userId: string, role: string) => {
    if (!selected) return
    await api(`/api/conversations/${selected.id}/participants/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }).catch(() => {})
    setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)))
  }

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      api<UserResult[]>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const addMember = async (userId: string) => {
    if (!selected) return
    await api(`/api/conversations/${selected.id}/participants`, {
      method: "POST",
      body: JSON.stringify({ participantIds: [userId] }),
    }).catch(() => {})
    const conv = await api<any>(`/api/conversations/${selected.id}`)
    setMembers(conv.members ?? [])
    setSearchQuery("")
    setSearchResults([])
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
        {!selected && <p className="text-sm text-text-muted">Select a group to manage</p>}
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-primary">Members ({members.length})</h3>
                {canManage && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                      {(m.displayName || m.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{m.displayName || m.username}</p>
                      <p className="text-xs text-text-muted">@{m.username}</p>
                    </div>
                    <span className="text-xs text-text-muted capitalize bg-bg-primary rounded-xl px-2.5 py-1">
                      {m.role}
                    </span>
                    {canManage && m.id !== user?.id && m.role !== "owner" && (
                      <button
                        onClick={() => removeMember(m.id)}
                        className="text-text-muted hover:text-danger cursor-pointer"
                        title="Remove member"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isOwner && m.id !== user?.id && m.role !== "owner" && (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="text-xs bg-transparent border border-border rounded-xl px-2 py-1 text-text-muted cursor-pointer outline-none"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
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
              <button
                onClick={() => setShowCreate(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
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

      {showAddMember && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddMember(false)}>
          <div
            className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Add Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-2xl border border-border bg-bg-primary">
              <Search className="h-4 w-4 text-text-muted shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {searchQuery.length >= 1 && searchResults.length === 0 && (
                <p className="text-sm text-text-muted text-center py-2">No users found</p>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => addMember(u.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                    {(u.displayName || u.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                    <p className="text-xs text-text-muted">@{u.username}</p>
                  </div>
                  <UserCheck className="h-4 w-4 text-accent shrink-0" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddMember(false)}
              className="w-full h-10 rounded-2xl border border-border text-text-muted text-sm font-medium hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
