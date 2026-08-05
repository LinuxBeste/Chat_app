import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { api } from "../lib/api";
import { wsClient } from "../lib/ws";
import { useTheme } from "../lib/theme-context";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  Plus,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Hash,
  Mic,
  Users,
  Link2,
  LogOut,
  Settings,
  Pencil,
  Trash2,
  Check,
} from "lucide-react-native";
import { useAuth } from "../lib/auth-context";

interface Channel {
  id: string;
  name: string;
  topic?: string;
}

interface VoiceChannel {
  id: string;
  name: string;
}

interface Member {
  id: string;
  userId: string;
  username?: string;
  role: string;
}

interface Invite {
  id: string;
  communityId?: string;
  code: string;
  useCount: number;
  maxUses: number | null;
  expiresAt: string | null;
}

interface Community {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  memberCount?: number;
  role?: string;
  channels?: Channel[];
  voiceChannels?: VoiceChannel[];
  members?: Member[];
}

export function CommunitiesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { c } = useTheme();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, Community>>({});
  const [chModal, setChModal] = useState(false);
  const [chName, setChName] = useState("");
  const [chType, setChType] = useState<"text" | "voice">("text");
  const [chCommunityId, setChCommunityId] = useState<string | null>(null);
  const [invites, setInvites] = useState<Record<string, Invite[]>>({});
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
  const [joinedVoice, setJoinedVoice] = useState<{
    channelId: string;
    communityName: string;
    channelName: string;
  } | null>(null);
  const [manageCommunity, setManageCommunity] = useState<Community | null>(null);
  const [manageName, setManageName] = useState("");
  const [manageDesc, setManageDesc] = useState("");
  const [savingManage, setSavingManage] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const load = useCallback(() => {
    api<Community[]>("/api/communities")
      .then(setCommunities)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadDetail = async (id: string) => {
    try {
      const [detail, inviteList] = await Promise.all([
        api<Community>(`/api/communities/${id}`),
        api<Invite[]>(`/api/communities/${id}/invites`).catch(() => []),
      ]);
      setExpanded((p) => ({ ...p, [id]: detail }));
      setInvites((p) => ({ ...p, [id]: inviteList }));
      if (manageCommunity?.id === id) {
        setManageCommunity(detail);
        setManageName(detail.name || "");
        setManageDesc(detail.description || "");
      }
    } catch {}
  };

  const toggleExpand = (item: Community) => {
    if (selected === item.id) {
      setSelected(null);
    } else {
      setSelected(item.id);
      loadDetail(item.id);
    }
  };

  const create = async () => {
    if (!name.trim()) return;
    try {
      await api("/api/communities", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      setName("");
      setDesc("");
      setCreateModal(false);
      load();
    } catch {}
  };

  const join = async () => {
    if (!inviteCode.trim()) return;
    try {
      await api(`/api/communities/join/${inviteCode.trim()}`, { method: "POST" });
      setInviteCode("");
      setJoinModal(false);
      load();
    } catch {}
  };

  const openManage = (item: Community) => {
    setManageCommunity(item);
    setManageName(item.name || "");
    setManageDesc(item.description || "");
    setSaveMsg("");
    loadDetail(item.id);
  };

  const saveManage = async () => {
    if (!manageCommunity || !manageName.trim()) return;
    setSavingManage(true);
    setSaveMsg("");
    try {
      await api(`/api/communities/${manageCommunity.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: manageName.trim(), description: manageDesc.trim() }),
      });
      setSaveMsg("Saved");
      load();
      loadDetail(manageCommunity.id);
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Failed to save");
    } finally {
      setSavingManage(false);
    }
  };

  const deleteCommunity = (id: string) => {
    Alert.alert("Delete Community", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          api(`/api/communities/${id}`, { method: "DELETE" })
            .then(() => {
              load();
              setSelected(null);
              setManageCommunity(null);
            })
            .catch(() => {});
        },
      },
    ]);
  };

  const leaveCommunity = (id: string) => {
    Alert.alert("Leave Community", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          api(`/api/communities/${id}/leave`, { method: "POST" })
            .then(() => {
              load();
              setSelected(null);
            })
            .catch(() => {});
        },
      },
    ]);
  };

  const openChModal = (communityId: string, type: "text" | "voice") => {
    setChCommunityId(communityId);
    setChType(type);
    setChName("");
    setChModal(true);
  };

  const createChannel = async () => {
    if (!chName.trim() || !chCommunityId) return;
    try {
      const endpoint =
        chType === "text" ? `/api/communities/${chCommunityId}/channels` : `/api/communities/${chCommunityId}/voice`;
      await api(endpoint, { method: "POST", body: JSON.stringify({ name: chName.trim() }) });
      setChModal(false);
      loadDetail(chCommunityId);
    } catch {}
  };

  const deleteChannel = async (communityId: string, channelId: string, isVoice: boolean) => {
    try {
      await api(isVoice ? `/api/communities/voice/${channelId}` : `/api/communities/channels/${channelId}`, {
        method: "DELETE",
      });
      loadDetail(communityId);
    } catch {}
  };

  const removeMember = async (communityId: string, userId: string) => {
    try {
      await api(`/api/communities/${communityId}/members/${userId}`, { method: "DELETE" });
      loadDetail(communityId);
    } catch {}
  };

  const changeRole = async (communityId: string, userId: string, role: string) => {
    try {
      await api(`/api/communities/${communityId}/members/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      loadDetail(communityId);
    } catch {}
  };

  const createInvite = async (communityId: string) => {
    try {
      await api(`/api/communities/${communityId}/invites`, { method: "POST" });
      loadDetail(communityId);
    } catch {}
  };

  const joinVoiceChannel = (channel: VoiceChannel, community: Community) => {
    wsClient.send("voice:join", { channelId: channel.id });
    setJoinedVoice({ channelId: channel.id, communityName: community.name, channelName: channel.name });
  };

  const leaveVoiceChannel = () => {
    if (joinedVoice) {
      wsClient.send("voice:leave", { channelId: joinedVoice.channelId });
      setJoinedVoice(null);
    }
  };

  const ChannelList = ({ community, manage }: { community: Community; manage?: boolean }) => {
    const isAdmin = manage || community.role === "owner" || community.role === "admin";
    return (
      <View style={st.section}>
        <View style={st.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Hash size={12} color={c.textMuted} />
            <Text style={[st.sectionTitle, { color: c.textMuted }]}>Text Channels</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={() => openChModal(community.id, "text")}>
              <Plus size={14} color={c.accent} />
            </TouchableOpacity>
          )}
        </View>
        {(community.channels ?? []).length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: 4 }}>No text channels</Text>
        ) : (
          (community.channels ?? []).map((ch) => (
            <View key={ch.id} style={st.channelRow}>
              <View style={st.channelNameWrap}>
                <Text style={[st.channelName, { color: c.text }]} numberOfLines={1}>
                  # {ch.name}
                </Text>
                {ch.topic ? (
                  <Text style={[st.channelTopic, { color: c.textMuted }]} numberOfLines={1}>
                    {ch.topic}
                  </Text>
                ) : null}
              </View>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => deleteChannel(community.id, ch.id, false)}
                  style={{ padding: 4, flexShrink: 0 }}
                >
                  <X size={14} color={c.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  const VoiceChannelList = ({ community, manage }: { community: Community; manage?: boolean }) => {
    const isAdmin = manage || community.role === "owner" || community.role === "admin";
    return (
      <View style={st.section}>
        <View style={st.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Mic size={12} color={c.textMuted} />
            <Text style={[st.sectionTitle, { color: c.textMuted }]}>Voice Channels</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={() => openChModal(community.id, "voice")}>
              <Plus size={14} color={c.accent} />
            </TouchableOpacity>
          )}
        </View>
        {(community.voiceChannels ?? []).length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: 4 }}>No voice channels</Text>
        ) : (
          (community.voiceChannels ?? []).map((vc) => (
            <View key={vc.id} style={st.channelRow}>
              <TouchableOpacity style={st.channelNameWrap} onPress={() => joinVoiceChannel(vc, community)}>
                <Text style={[st.channelName, { color: c.text }]} numberOfLines={1}>
                  🔊 {vc.name}
                </Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => deleteChannel(community.id, vc.id, true)}
                  style={{ padding: 4, flexShrink: 0 }}
                >
                  <X size={14} color={c.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  const ManagePage = () => {
    if (!manageCommunity) return null;
    const mc = manageCommunity;
    return (
      <Modal visible animationType="slide" onRequestClose={() => setManageCommunity(null)}>
        <View style={[st.container, { backgroundColor: c.bg }]}>
          <View
            style={[
              st.manageHeader,
              { backgroundColor: c.bg, borderBottomColor: c.borderLight, paddingTop: insets.top + 10 },
            ]}
          >
            <TouchableOpacity onPress={() => setManageCommunity(null)} style={st.backBtn}>
              <ChevronLeft size={24} color={c.accent} />
            </TouchableOpacity>
            <Text style={[st.manageTitle, { color: c.text }]}>Manage Community</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={st.manageScroll} showsVerticalScrollIndicator={false}>
            <View style={[st.manageCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <View style={st.manageCardHeader}>
                <Pencil size={14} color={c.accent} />
                <Text style={[st.manageCardTitle, { color: c.text }]}>Community Info</Text>
              </View>
              <TextInput
                style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                placeholder="Name"
                placeholderTextColor={c.textMuted}
                value={manageName}
                onChangeText={setManageName}
              />
              <TextInput
                style={[
                  st.modalInput,
                  st.modalTextArea,
                  { backgroundColor: c.inputBg, color: c.text, borderColor: c.border },
                ]}
                placeholder="Description (optional)"
                placeholderTextColor={c.textMuted}
                value={manageDesc}
                onChangeText={setManageDesc}
                multiline
              />
              <TouchableOpacity
                style={[st.confirmBtn, { backgroundColor: c.accent, alignSelf: "flex-start" }]}
                onPress={saveManage}
                disabled={savingManage}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Check size={14} color="#FFFFFF" />
                  <Text style={st.confirmText}>{savingManage ? "Saving..." : "Save"}</Text>
                </View>
              </TouchableOpacity>
              {saveMsg ? <Text style={{ color: c.success, fontSize: 12, marginTop: 6 }}>{saveMsg}</Text> : null}
            </View>

            <View style={[st.manageCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <ChannelList community={mc} manage />
            </View>

            <View style={[st.manageCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <VoiceChannelList community={mc} manage />
            </View>

            <View style={[st.manageCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Users size={12} color={c.textMuted} />
                    <Text style={[st.sectionTitle, { color: c.textMuted }]}>Members ({mc.members?.length ?? 0})</Text>
                  </View>
                </View>
                {(mc.members ?? []).map((m) => (
                  <View key={m.userId} style={st.memberRow}>
                    <View style={[st.memberAvatar, { backgroundColor: c.surfaceAlt }]}>
                      <Text style={[st.memberAvatarText, { color: c.text }]}>
                        {(m.username || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[st.memberName, { color: c.text }]} numberOfLines={1}>
                      {m.username || m.userId}
                    </Text>
                    <Text style={[st.memberRole, { color: c.textMuted }]}>{m.role}</Text>
                    {m.role !== "owner" && (
                      <View style={{ flexDirection: "row", gap: 4, flexShrink: 0 }}>
                        <TouchableOpacity
                          onPress={() => changeRole(mc.id, m.userId, m.role === "admin" ? "member" : "admin")}
                          style={{ padding: 4 }}
                        >
                          <Text style={{ color: c.accent, fontSize: 11, fontWeight: "600" }}>
                            {m.role === "admin" ? "Demote" : "Promote"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeMember(mc.id, m.userId)} style={{ padding: 4 }}>
                          <X size={14} color={c.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View style={[st.manageCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Link2 size={12} color={c.textMuted} />
                    <Text style={[st.sectionTitle, { color: c.textMuted }]}>Invites</Text>
                  </View>
                  <TouchableOpacity onPress={() => createInvite(mc.id)}>
                    <Plus size={14} color={c.accent} />
                  </TouchableOpacity>
                </View>
                {(invites[mc.id] || []).length === 0 && (
                  <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: 4 }}>No invites yet</Text>
                )}
                {(invites[mc.id] || []).map((inv) => (
                  <View key={inv.id} style={st.channelRow}>
                    <Text
                      style={{ color: c.accent, fontSize: 12, fontFamily: "monospace", flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      {inv.code}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11, flexShrink: 0 }}>
                      {inv.useCount}
                      {inv.maxUses ? `/${inv.maxUses}` : ""}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setStringAsync(inv.code);
                        setCopiedInvite(inv.id);
                        setTimeout(() => setCopiedInvite(null), 2000);
                      }}
                      style={{ flexShrink: 0, padding: 4 }}
                    >
                      <Text style={{ color: copiedInvite === inv.id ? c.success : c.accent, fontSize: 12 }}>
                        {copiedInvite === inv.id ? "Copied!" : "Copy"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[st.dangerBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: c.border }]}
              onPress={() => deleteCommunity(mc.id)}
            >
              <Trash2 size={16} color={c.danger} />
              <Text style={{ color: c.danger, fontSize: 15, fontWeight: "600" }}>Delete Community</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[st.container, { backgroundColor: c.bg }]}>
      <View style={[st.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
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
          const detail = expanded[item.id];
          const isOwner = item.role === "owner";
          const isExpanded = selected === item.id;
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
                  {item.description ? (
                    <Text style={[st.communityDesc, { color: c.textMuted }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {isOwner && (
                  <TouchableOpacity
                    style={[st.manageBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                    onPress={() => openManage(item)}
                  >
                    <Settings size={13} color={c.accent} />
                    <Text style={[st.manageBtnText, { color: c.accent }]}>Manage</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Text style={[st.memberCount, { color: c.textMuted }]}>
                    {item.memberCount ?? detail?.members?.length ?? 0}
                  </Text>
                  {isExpanded ? (
                    <ChevronDown size={14} color={c.textMuted} />
                  ) : (
                    <ChevronRight size={14} color={c.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <View style={[st.expanded, { backgroundColor: c.surface, borderBottomColor: c.borderLight }]}>
                  <ChannelList community={detail ?? item} />
                  <VoiceChannelList community={detail ?? item} />
                  {detail?.members && (
                    <View style={st.section}>
                      <View style={st.sectionHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Users size={12} color={c.textMuted} />
                          <Text style={[st.sectionTitle, { color: c.textMuted }]}>
                            Members ({detail.members.length})
                          </Text>
                        </View>
                      </View>
                      {detail.members.map((m) => (
                        <View key={m.userId} style={st.memberRow}>
                          <View style={[st.memberAvatar, { backgroundColor: c.surfaceAlt }]}>
                            <Text style={[st.memberAvatarText, { color: c.text }]}>
                              {(m.username || "?")[0].toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[st.memberName, { color: c.text }]} numberOfLines={1}>
                            {m.username || m.userId}
                          </Text>
                          <Text style={[st.memberRole, { color: c.textMuted }]}>{m.role}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!isOwner && (
                    <TouchableOpacity
                      style={[st.leaveBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: c.border }]}
                      onPress={() => leaveCommunity(item.id)}
                    >
                      <LogOut size={14} color={c.danger} />
                      <Text style={{ color: c.danger, fontSize: 13, fontWeight: "600" }}>Leave Community</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
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

      <ManagePage />

      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => setCreateModal(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>{t("communities.create")}</Text>
            <TextInput
              style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder="Name"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[
                st.modalInput,
                st.modalTextArea,
                { backgroundColor: c.inputBg, color: c.text, borderColor: c.border },
              ]}
              placeholder="Description (optional)"
              placeholderTextColor={c.textMuted}
              value={desc}
              onChangeText={setDesc}
              multiline
            />
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setCreateModal(false)} style={st.cancelBtn}>
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={create} style={[st.confirmBtn, { backgroundColor: c.accent }]}>
                <Text style={st.confirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={joinModal} transparent animationType="fade" onRequestClose={() => setJoinModal(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>{t("communities.join")}</Text>
            <TextInput
              style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder={t("communities.inviteCode")}
              placeholderTextColor={c.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
            />
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setJoinModal(false)} style={st.cancelBtn}>
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={join} style={[st.confirmBtn, { backgroundColor: c.accent }]}>
                <Text style={st.confirmText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={chModal} transparent animationType="fade" onRequestClose={() => setChModal(false)}>
        <View style={[st.overlay, { backgroundColor: c.overlay }]}>
          <View style={[st.modal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>Create {chType} channel</Text>
            <TextInput
              style={[st.modalInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder="Channel name"
              placeholderTextColor={c.textMuted}
              value={chName}
              onChangeText={setChName}
            />
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setChModal(false)} style={st.cancelBtn}>
                <Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createChannel} style={[st.confirmBtn, { backgroundColor: c.accent }]}>
                <Text style={st.confirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexWrap: "wrap",
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: "700", flexShrink: 1 },
  headerActions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  actionBtn: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  communityItem: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, gap: 8 },
  communityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    borderWidth: 1,
  },
  communityAvatarText: { fontSize: 18, fontWeight: "700" },
  communityContent: { flex: 1, marginRight: 4 },
  communityName: { fontSize: 15, fontWeight: "600" },
  communityDesc: { fontSize: 11, marginTop: 1 },
  memberCount: { fontSize: 11 },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  manageBtnText: { fontSize: 12, fontWeight: "600" },
  expanded: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  section: { marginBottom: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
    gap: 4,
  },
  channelNameWrap: { flex: 1, paddingVertical: 2 },
  channelName: { fontSize: 14 },
  channelTopic: { fontSize: 11, marginTop: 1 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5 },
  memberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  memberAvatarText: { fontSize: 11, fontWeight: "600" },
  memberName: { fontSize: 13, flexShrink: 1 },
  memberRole: { fontSize: 11, textTransform: "capitalize", flexShrink: 0 },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  voiceBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
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
  manageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  manageTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { padding: 4, width: 32 },
  manageScroll: { padding: 16 },
  manageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  manageCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  manageCardTitle: { fontSize: 14, fontWeight: "600" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 24,
  },
});
