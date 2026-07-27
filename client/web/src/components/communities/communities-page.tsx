import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { useTranslation } from "react-i18next"
import { Plus, X, Globe, Hash, Link, Check, Copy, Crown, Headphones } from "lucide-react"
import { VoiceChannel } from "./voice-channel"

interface Community {
  id: string
  name: string
  description: string | null
  ownerId: string
  createdAt: string
}

interface Channel {
  id: string
  communityId: string
  name: string
  topic: string | null
}

interface Member {
  userId: string
  communityId: string
  role: string
}

interface Invite {
  id: string
  communityId: string
  code: string
  useCount: number
  maxUses: number | null
  expiresAt: string | null
}

export function CommunitiesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [communities, setCommunities] = useState<Community[]>([])
  const [selected, setSelected] = useState<Community | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [voiceChannels, setVoiceChannels] = useState<any[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [newChannel, setNewChannel] = useState("")
  const [newVoice, setNewVoice] = useState("")
  const [activeVoice, setActiveVoice] = useState<{ id: string; name: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const currentMember = members.find((m) => m.userId === user?.id)
  const canManage = currentMember?.role === "owner" || currentMember?.role === "admin"
  const isOwner = currentMember?.role === "owner"

  useEffect(() => {
    api<Community[]>("/api/communities")
      .then(setCommunities)
      .catch(() => {})
  }, [])

  const selectCommunity = async (c: Community) => {
    setSelected(c)
    const data = await api<any>(`/api/communities/${c.id}`).catch(() => null)
    if (data) {
      setChannels(data.channels ?? [])
      setVoiceChannels(data.voiceChannels ?? [])
      setMembers(data.members ?? [])
    }
    const invs = await api<Invite[]>(`/api/communities/${c.id}/invites`).catch(() => [])
    setInvites(invs ?? [])
  }

  const createCommunity = async () => {
    if (!createName.trim()) return
    const c = await api<Community>("/api/communities", {
      method: "POST",
      body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || undefined }),
    }).catch(() => null)
    if (c) {
      setCommunities((prev) => [c, ...prev.filter((comm) => comm.id !== c.id)])
      setCreateName("")
      setCreateDesc("")
      setShowCreate(false)
      selectCommunity(c)
    }
  }

  const joinCommunity = async () => {
    if (!joinCode.trim()) return
    await api(`/api/communities/join/${joinCode.trim()}`, { method: "POST" }).catch(() => null)
    setJoinCode("")
    setShowJoin(false)
    api<Community[]>("/api/communities")
      .then(setCommunities)
      .catch(() => {})
  }

  const createChannel = async () => {
    if (!selected || !newChannel.trim()) return
    const ch = await api<Channel>(`/api/communities/${selected.id}/channels`, {
      method: "POST",
      body: JSON.stringify({ name: newChannel.trim() }),
    }).catch(() => null)
    if (ch) {
      setChannels((prev) => (prev.some((ch2) => ch2.id === ch.id) ? prev : [...prev, ch]))
      setNewChannel("")
    }
  }

  const createVoiceChannel = async () => {
    if (!selected || !newVoice.trim()) return
    const ch = await api<any>(`/api/communities/${selected.id}/voice`, {
      method: "POST",
      body: JSON.stringify({ name: newVoice.trim() }),
    }).catch(() => null)
    if (ch) {
      setVoiceChannels((prev) => (prev.some((v) => v.id === ch.id) ? prev : [...prev, ch]))
      setNewVoice("")
    }
  }

  const joinVoiceChannel = (id: string, name: string) => {
    setActiveVoice({ id, name })
  }

  const leaveVoiceChannel = () => {
    setActiveVoice(null)
  }

  const createInvite = async () => {
    if (!selected) return
    const inv = await api<Invite>(`/api/communities/${selected.id}/invites`, {
      method: "POST",
    }).catch(() => null)
    if (inv) {
      setInvites((prev) => (prev.some((i) => i.id === inv.id) ? prev : [...prev, inv]))
    }
  }

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{t("communities.title")}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setShowJoin(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
              aria-label={t("communities.joinCommunity")}
            >
              <Link className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
              aria-label={t("communities.createCommunity")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {communities.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCommunity(c)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer hover:bg-white/[0.02] ${selected?.id === c.id ? "bg-accent/[0.03]" : ""}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                {c.description && <p className="text-xs text-text-muted truncate">{c.description}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selected && <p className="text-sm text-text-muted">{t("communities.selectCommunity")}</p>}
        {selected && (
          <div className="max-w-lg space-y-6">
            <h1 className="text-lg font-semibold text-text-primary">{selected.name}</h1>

            {/* Channels */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">{t("communities.channels")}</h3>
              <div className="space-y-1.5">
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                    <Hash className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="text-sm text-text-primary">{ch.name}</span>
                    {ch.topic && <span className="text-xs text-text-muted ml-2">— {ch.topic}</span>}
                  </div>
                ))}
              </div>
              {canManage && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    placeholder={t("communities.newChannelName")}
                    className="flex-1 h-9 rounded-2xl border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={createChannel}
                    disabled={!newChannel.trim()}
                    className="h-9 rounded-2xl bg-accent text-white text-sm px-3 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                  >
                    {t("communities.add")}
                  </button>
                </div>
              )}
            </div>

            {/* Voice Channels */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">
                <Headphones className="h-4 w-4 inline mr-1.5 text-text-muted" />
                {t("communities.voiceChannels")}
              </h3>
              <div className="space-y-1.5">
                {voiceChannels.map((vc) => (
                  <div
                    key={vc.id}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                    <Headphones className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-sm text-text-primary flex-1">{vc.name}</span>
                    {activeVoice?.id === vc.id ? (
                      <span className="text-xs text-accent font-medium">{t("voice.connected")}</span>
                    ) : (
                      <button
                        onClick={() => joinVoiceChannel(vc.id, vc.name)}
                        className="h-7 rounded-xl bg-accent text-white text-xs px-3 font-medium hover:bg-accent-hover transition-all cursor-pointer"
                      >
                        {t("voice.join")}
                      </button>
                    )}
                    {canManage && activeVoice?.id !== vc.id && (
                      <button
                        onClick={() =>
                          api(`/api/communities/voice/${vc.id}`, { method: "DELETE" }).then(() => {
                            setVoiceChannels((prev) => prev.filter((v) => v.id !== vc.id))
                          })
                        }
                        className="text-text-muted hover:text-danger cursor-pointer"
                        title={t("communities.delete")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canManage && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newVoice}
                    onChange={(e) => setNewVoice(e.target.value)}
                    placeholder={t("communities.newVoiceChannelName")}
                    className="flex-1 h-9 rounded-2xl border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={createVoiceChannel}
                    disabled={!newVoice.trim()}
                    className="h-9 rounded-2xl bg-accent text-white text-sm px-3 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                  >
                    {t("communities.add")}
                  </button>
                </div>
              )}
            </div>

            {/* Members */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">
                {t("communities.members")} ({members.length})
              </h3>
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold shrink-0">
                      {m.userId.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-text-primary truncate flex-1">
                      {m.userId.slice(0, 8)}...
                      {m.userId === selected?.ownerId && <Crown className="h-3 w-3 inline ml-1 text-yellow-400" />}
                    </span>
                    <span className="text-xs text-text-muted capitalize bg-bg-primary rounded-xl px-2.5 py-1">
                      {m.role}
                    </span>
                    {canManage && m.userId !== user?.id && m.role !== "owner" && (
                      <button
                        onClick={() =>
                          api(`/api/communities/${selected?.id}/members/${m.userId}`, { method: "DELETE" }).then(() => {
                            setMembers((prev) => prev.filter((mm) => mm.userId !== m.userId))
                          })
                        }
                        className="text-text-muted hover:text-danger cursor-pointer"
                        title={t("communities.removeMember")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isOwner && m.userId !== user?.id && m.role !== "owner" && (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          api(`/api/communities/${selected?.id}/members/${m.userId}/role`, {
                            method: "PUT",
                            body: JSON.stringify({ role: e.target.value }),
                          }).then(() => {
                            setMembers((prev) =>
                              prev.map((mm) => (mm.userId === m.userId ? { ...mm, role: e.target.value } : mm)),
                            )
                          })
                        }
                        className="text-xs bg-transparent border border-border rounded-xl px-1.5 py-1 text-text-muted cursor-pointer outline-none"
                      >
                        <option value="member">{t("communities.member")}</option>
                        <option value="admin">{t("communities.admin")}</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invites */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-primary">{t("communities.invites")}</h3>
                {canManage && (
                  <button
                    onClick={createInvite}
                    className="flex items-center gap-1.5 h-8 rounded-2xl bg-accent/10 text-accent text-xs px-3 font-medium hover:bg-accent/20 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("communities.generate")}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                    <Link className="h-4 w-4 text-text-muted shrink-0" />
                    <code className="text-sm text-accent flex-1">{inv.code}</code>
                    <span className="text-xs text-text-muted">
                      {inv.useCount}
                      {inv.maxUses ? `/${inv.maxUses}` : ""} {t("communities.used")}
                    </span>
                    <button
                      onClick={() => copyInvite(inv.code)}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary transition-all cursor-pointer"
                      aria-label={t("communities.copyInviteCode")}
                    >
                      {copied === inv.code ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
                {invites.length === 0 && <p className="text-xs text-text-muted">{t("communities.noInvites")}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">{t("communities.createTitle")}</h3>
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
              placeholder={t("communities.communityName")}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 mb-3"
            />
            <input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder={t("communities.descriptionOptional")}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 mb-4"
            />
            <button
              onClick={createCommunity}
              disabled={!createName.trim()}
              className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
            >
              {t("communities.create")}
            </button>
          </div>
        </div>
      )}

      {activeVoice && (
        <VoiceChannel channelId={activeVoice.id} channelName={activeVoice.name} onLeave={leaveVoiceChannel} />
      )}

      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">{t("communities.joinTitle")}</h3>
              <button
                onClick={() => setShowJoin(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder={t("communities.enterInviteCode")}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 mb-4"
            />
            <button
              onClick={joinCommunity}
              disabled={!joinCode.trim()}
              className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
            >
              {t("communities.join")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
