import { useState, useEffect, useCallback } from "react"
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Modal, Alert, ScrollView } from "react-native"
import { api } from "../lib/api"
import { wsClient } from "../lib/ws"
import { useTheme } from "../lib/theme-context"
import { useTranslation } from "react-i18next"
import * as Clipboard from "expo-clipboard"
import { Plus, X, Volume2, VolumeX, ChevronDown, ChevronRight, Hash, Mic, Users, Link2 } from "lucide-react-native"
import { useAuth } from "../lib/auth-context"

interface Channel {
  id: string
  name: string
  topic?: string
}

interface VoiceChannel {
  id: string
  name: string
}

interface Member {
  id: string
  userId: string
  username?: string
  role: string
}

interface Invite {
  id: string
  communityId?: string
  code: string
  useCount: number
  maxUses: number | null
  expiresAt: string | null
}

interface Community {
  id: string
  name: string
  description?: string
  memberCount?: number
  role?: string
  channels?: Channel[]
  voiceChannels?: VoiceChannel[]
  members?: Member[]
}

export function CommunitiesScreen({ onSelectChat }: { onSelectChat?: (id: string) => void }) {
  const { t } = useTranslation()
  const { c } = useTheme()
  const { user } = useAuth()
  const [communities, setCommunities] = useState<Community[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [joinModal, setJoinModal] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, Community>>({})
  const [chModal, setChModal] = useState(false)
  const [chName, setChName] = useState("")
  const [chType, setChType] = useState<"text" | "voice">("text")
  const [chCommunityId, setChCommunityId] = useState<string | null>(null)
  const [invites, setInvites] = useState<Record<string, Invite[]>>({})
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)
  const [joinedVoice, setJoinedVoice] = useState<{ channelId: string; communityName: string; channelName: string } | null>(null)

  const load = useCallback(() => {
    api<Community[]>("/api/communities").then(setCommunities).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false)
  }, [load])

  const loadDetail = async (id: string) => {
    try {
      const [detail, inviteList] = await Promise.all([
        api<Community>(`/api/communities/${id}`),
        api<Invite[]>(`/api/communities/${id}/invites`).catch(() => []),
      ])
      setExpanded((p) => ({ ...p, [id]: detail }))
      setInvites((p) => ({ ...p, [id]: inviteList }))
    } catch {}
  }

  const toggleExpand = (item: Community) => {
    if (selected === item.id) { setSelected(null) }
    else { setSelected(item.id); loadDetail(item.id) }
  }

  const create = async () => {
    if (!name.trim()) return
    try {
      await api("/api/communities", { method: "POST", body: JSON.stringify({ name: name.trim(), description: desc.trim() }) })
      setName(""); setDesc(""); setCreateModal(false); load()
    } catch {}
  }

  const join = async () => {
    if (!inviteCode.trim()) return
    try {
      await api(`/api/communities/join/${inviteCode.trim()}`, { method: "POST" })
      setInviteCode(""); setJoinModal(false); load()
    } catch {}
  }

  const deleteCommunity = (id: string) => {
    Alert.alert("Delete Community", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        api(`/api/communities/${id}`, { method: "DELETE" }).then(() => { load(); setSelected(null) }).catch(() => {})
      }},
    ])
  }

  const openChModal = (communityId: string, type: "text" | "voice") => {
    setChCommunityId(communityId); setChType(type); setChName(""); setChModal(true)
  }

  const createChannel = async () => {
    if (!chName.trim() || !chCommunityId) return
    try {
      const endpoint = chType === "text"
        ? `/api/communities/${chCommunityId}/channels`
        : `/api/communities/${chCommunityId}/voice`
      await api(endpoint, { method: "POST", body: JSON.stringify({ name: chName.trim() }) })
      setChModal(false); loadDetail(chCommunityId)
    } catch {}
  }

  const deleteChannel = async (communityId: string, channelId: string, isVoice: boolean) => {
    try {
      await api(isVoice ? `/api/communities/voice/${channelId}` : `/api/communities/channels/${channelId}`, { method: "DELETE" })
      loadDetail(communityId)
    } catch {}
  }

  const removeMember = async (communityId: string, userId: string) => {
    try { await api(`/api/communities/${communityId}/members/${userId}`, { method: "DELETE" }); loadDetail(communityId) } catch {}
  }

  const changeRole = async (communityId: string, userId: string, role: string) => {
    try {
      await api(`/api/communities/${communityId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) })
      loadDetail(communityId)
    } catch {}
  }

  const createInvite = async (communityId: string) => {
    try { await api(`/api/communities/${communityId}/invites`, { method: "POST" }); loadDetail(communityId) } catch {}
  }

  const joinVoiceChannel = (channel: VoiceChannel, community: Community) => {
    wsClient.send("voice:join", { channelId: channel.id })
    setJoinedVoice({ channelId: channel.id, communityName: community.name, channelName: channel.name })
  }

  const leaveVoiceChannel = () => {
    if (joinedVoice) { wsClient.send("voice:leave", { channelId: joinedVoice.channelId }); setJoinedVoice(null) }
  }

  return (
    <View style={[st.container, { backgroundColor: c.bg }]}>
      <View style={[st.header, { borderBottomColor: c.borderLight }]}>
        <Text style={[st.title, { color: c.text }]}>{t("communities.title")}</Text>
        <View style={st.headerActions}>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: c.accent }]} onPress={() => setJoinModal(true)}>
            <Text style={st.actionText}>{t("communities.join")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: c.accent }]} onPress={() => setCreateModal(true)}>
            <Text style={st.actionText}>+ {t("communities.create")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={communities}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        renderItem={({ item }) => {
          const detail = expanded[item.id]
          const isOwner = item.role === "owner"
          const isAdmin = item.role === "owner" || item.role === "admin"
          const isExpanded = selected === item.id
          return (
            <View>
              <TouchableOpacity
                style={[st.communityItem, { borderBottomColor: c.borderLight }]}
                onPress={() => toggleExpand(item)}
                activeOpacity={0.7}
              >
                <View style={[st.communityAvatar, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Text style={[st.communityAvatarText, { color: c.text }]}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={st.communityContent}>
                  <Text style={[st.communityName, { color: c.text }]}>{item.name}</Text>
                  {item.description ? <Text style={[st.communityDesc, { color: c.textMuted }]} numberOfLines={1}>{item.description}</Text> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Text style={[st.memberCount, { color: c.textMuted }]}>{item.memberCount ?? detail?.members?.length ?? 0}</Text>
                  {isExpanded ? <ChevronDown size={14} color={c.textMuted} /> : <ChevronRight size={14} color={c.textMuted} />}
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <View style={[st.expanded, { backgroundColor: c.surface, borderBottomColor: c.borderLight }]}>
                  {isOwner && (
                    <TouchableOpacity style={st.deleteBtn} onPress={() => deleteCommunity(item.id)}>
                      <Text style={{ color: c.danger, fontSize: 13, fontWeight: "500" }}>Delete Community</Text>
                    </TouchableOpacity>
                  )}

                  <View style={st.section}>
                    <View style={st.sectionHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Hash size={12} color={c.textMuted} />
                        <Text style={[st.sectionTitle, { color: c.textMuted }]}>Text Channels</Text>
                      </View>
                      {isAdmin && <TouchableOpacity onPress={() => openChModal(item.id, "text")}><Plus size={14} color={c.accent} /></TouchableOpacity>}
                    </View>
                    {(detail?.channels ?? []).length === 0 ? (
                      <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: 4 }}>No text channels</Text>
                    ) : (
                      (detail?.channels ?? []).map((ch) => (
                        <View key={ch.id} style={st.channelRow}>
                          <TouchableOpacity style={st.channelNameWrap} onPress={() => onSelectChat?.(ch.id)}>
                            <Text style={[st.channelName, { color: c.text }]} numberOfLines={1}># {ch.name}</Text>
                            {ch.topic ? <Text style={[st.channelTopic, { color: c.textMuted }]} numberOfLines={1}>{ch.topic}</Text> : null}
                          </TouchableOpacity>
                          {isAdmin && (
                            <TouchableOpacity onPress={() => deleteChannel(item.id, ch.id, false)} style={{ padding: 4, flexShrink: 0 }}>
                              <X size={14} color={c.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  <View style={st.section}>
                    <View style={st.sectionHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Mic size={12} color={c.textMuted} />
                        <Text style={[st.sectionTitle, { color: c.textMuted }]}>Voice Channels</Text>
                      </View>
                      {isAdmin && <TouchableOpacity onPress={() => openChModal(item.id, "voice")}><Plus size={14} color={c.accent} /></TouchableOpacity>}
                    </View>
                    {(detail?.voiceChannels ?? []).length === 0 ? (
                      <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: 4 }}>No voice channels</Text>
                    ) : (
                      (detail?.voiceChannels ?? []).map((vc) => (
                        <View key={vc.id} style={st.channelRow}>
                          <TouchableOpacity style={st.channelNameWrap} onPress={() => joinVoiceChannel(vc, item)}>
                            <Text style={[st.channelName, { color: c.text }]} numberOfLines={1}>🔊 {vc.name}</Text>
                          </TouchableOpacity>
                          {isAdmin && (
                            <TouchableOpacity onPress={() => deleteChannel(item.id, vc.id, true)} style={{ padding: 4, flexShrink: 0 }}>
                              <X size={14} color={c.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  {detail?.members && (
                    <View style={st.section}>
                      <View style={st.sectionHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Users size={12} color={c.textMuted} />
                          <Text style={[st.sectionTitle, { color: c.textMuted }]}>Members ({detail.members.length})</Text>
                        </View>
                      </View>
                      {detail.members.map((m) => (
                        <View key={m.userId} style={st.memberRow}>
                          <View style={[st.memberAvatar, { backgroundColor: c.surfaceAlt }]}>
                            <Text style={[st.memberAvatarText, { color: c.text }]}>{(m.username || "?")[0].toUpperCase()}</Text>
                          </View>
                          <Text style={[st.memberName, { color: c.text }]} numberOfLines={1}>{m.username || m.userId}</Text>
                          <Text style={[st.memberRole, { color: c.textMuted }]}>{m.role}</Text>
                          {m.role !== "owner" && isOwner && (
                            <View style={{ flexDirection: "row", gap: 4, flexShrink: 0 }}>
                              <TouchableOpacity onPress={() => changeRole(item.id, m.userId, m.role === "admin" ? "member" : "admin")} style={{ padding: 4 }}>
                                <Text style={{ color: c.accent, fontSize: 11, fontWeight: "600" }}>{m.role === "admin" ? "Demote" : "Promote"}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => removeMember(item.id, m.userId)} style={{ padding: 4 }}>
                                <X size={14} color={c.danger} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {isAdmin && (
                    <View style={st.section}>
                      <View style={st.sectionHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Link2 size={12} color={c.textMuted} />
                          <Text style={[st.sectionTitle, { color: c.textMuted }]}>Invites</Text>
                        </View>
                        <TouchableOpacity onPress={() => createInvite(item.id)}><Plus size={14} color={c.accent} /></TouchableOpacity>
                      </View>
                      {(invites[item.id] || []).length === 0 && <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: 4 }}>No invites yet</Text>}
                      {(invites[item.id] || []).map((inv) => (
                        <View key={inv.id} style={st.channelRow}>
                          <Text style={{ color: c.accent, fontSize: 12, fontFamily: "monospace", flexShrink: 1 }} numberOfLines={1}>{inv.code}</Text>
                          <Text style={{ color: c.textMuted, fontSize: 11, flexShrink: 0 }}>{inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ""}</Text>
                          <TouchableOpacity onPress={() => { Clipboard.setStringAsync(inv.code); setCopiedInvite(inv.id); setTimeout(() => setCopiedInvite(null), 2000) }} style={{ flexShrink: 0, padding: 4 }}>
                            <Text style={{ color: copiedInvite === inv.id ? c.success : c.accent, fontSize: 12 }}>{copiedInvite === inv.id ? "Copied!" : "Copy"}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        }}
        ListEmptyComponent={<Text style={[st.empty, { color: c.textMuted }]}>{t("communities.noCommunities")}</Text>}
      />

      {joinedVoice && (
        <View style={[st.voiceBar, { backgroundColor: c.surfaceAlt, borderTopColor: c.border }]}>
          <Volume2 size={18} color={c.success} />
          <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>
            <Text style={[st.voiceBarTitle, { color: c.success }]}>{joinedVoice.channelName}</Text>
            <Text style={[st.voiceBarSub, { color: c.textMuted }]}>{joinedVoice.communityName}</Text>
          </View>
          <TouchableOpacity style={st.voiceLeaveBtn} onPress={leaveVoiceChannel}>
            <VolumeX size={18} color={c.danger} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => setCreateModal(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>{t("communities.create")}</Text>
            <TextInput style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]} placeholder="Name" placeholderTextColor={c.textMuted} value={name} onChangeText={setName} />
            <TextInput style={[st.modalInput, st.modalTextArea, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]} placeholder="Description (optional)" placeholderTextColor={c.textMuted} value={desc} onChangeText={setDesc} multiline />
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setCreateModal(false)} style={st.cancelBtn}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={create} style={[st.confirmBtn, { backgroundColor: c.accent }]}><Text style={st.confirmText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={joinModal} transparent animationType="fade" onRequestClose={() => setJoinModal(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>{t("communities.join")}</Text>
            <TextInput style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]} placeholder={t("communities.inviteCode")} placeholderTextColor={c.textMuted} value={inviteCode} onChangeText={setInviteCode} />
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setJoinModal(false)} style={st.cancelBtn}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={join} style={[st.confirmBtn, { backgroundColor: c.accent }]}><Text style={st.confirmText}>Join</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={chModal} transparent animationType="fade" onRequestClose={() => setChModal(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>Create {chType} channel</Text>
            <TextInput style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]} placeholder="Channel name" placeholderTextColor={c.textMuted} value={chName} onChangeText={setChName} />
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setChModal(false)} style={st.cancelBtn}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createChannel} style={[st.confirmBtn, { backgroundColor: c.accent }]}><Text style={st.confirmText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexWrap: "wrap", gap: 8 },
  title: { fontSize: 22, fontWeight: "700", flexShrink: 1 },
  headerActions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  actionBtn: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  communityItem: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  communityAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1 },
  communityAvatarText: { fontSize: 18, fontWeight: "700" },
  communityContent: { flex: 1, marginRight: 8 },
  communityName: { fontSize: 15, fontWeight: "600" },
  communityDesc: { fontSize: 11, marginTop: 1 },
  memberCount: { fontSize: 11 },
  deleteBtn: { paddingVertical: 8, alignItems: "center" },
  expanded: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  section: { marginBottom: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  channelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3, gap: 4 },
  channelNameWrap: { flex: 1, paddingVertical: 2 },
  channelName: { fontSize: 14 },
  channelTopic: { fontSize: 11, marginTop: 1 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5 },
  memberAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  memberAvatarText: { fontSize: 11, fontWeight: "600" },
  memberName: { fontSize: 13, flexShrink: 1 },
  memberRole: { fontSize: 11, textTransform: "capitalize", flexShrink: 0 },
  voiceBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  voiceBarTitle: { fontSize: 14, fontWeight: "600" },
  voiceBarSub: { fontSize: 11 },
  voiceLeaveBtn: { padding: 8 },
  empty: { textAlign: "center", marginTop: 60, fontSize: 15 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  modalTextArea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  confirmBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
