import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import { useTheme } from "../lib/theme-context";

interface Stats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalCommunities: number;
  totalFiles: number;
  totalReports: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  isSuspended: string;
  isAdmin: string;
  createdAt: string;
}

type AdminTab = "stats" | "users" | "reports" | "bans" | "activity" | "admins";

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [tab, setTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "stats", label: t("admin.stats") },
    { key: "users", label: t("admin.users") },
    { key: "reports", label: t("admin.reports") },
    { key: "bans", label: t("admin.bans") },
    { key: "activity", label: t("admin.activity") },
    { key: "admins", label: t("admin.manageAdmins") },
  ];

  useEffect(() => {
    if (tab === "stats")
      api<Stats>("/api/admin/stats")
        .then(setStats)
        .catch(() => {});
  }, [tab]);

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={[s.back, { color: c.accent }]}>
            {"<"} {t("common.back")}
          </Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: c.text }]}>{t("admin.title")}</Text>
        <View style={{ width: 50 }} />
      </View>
      <View style={[s.tabsRow, { borderBottomColor: c.borderLight }]}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={(t) => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                s.tab,
                { backgroundColor: c.surfaceAlt },
                tab === item.key && [s.tabActive, { backgroundColor: c.accent }],
              ]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[s.tabText, { color: c.textSecondary }, tab === item.key && s.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {tab === "stats" && stats && (
        <View style={ss.statsGrid}>
          {[
            { label: "Users", value: stats.totalUsers },
            { label: "Conversations", value: stats.totalConversations },
            { label: "Messages", value: stats.totalMessages },
            { label: "Communities", value: stats.totalCommunities },
            { label: "Files", value: stats.totalFiles },
            { label: "Reports", value: stats.totalReports },
          ].map((stat) => (
            <View key={stat.label} style={[ss.statCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <Text style={[ss.statValue, { color: c.text }]}>{stat.value}</Text>
              <Text style={[ss.statLabel, { color: c.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}
      {tab === "users" && <AdminUsers />}
      {tab === "reports" && <AdminReports />}
      {tab === "bans" && <AdminBans />}
      {tab === "activity" && <AdminActivity />}
      {tab === "admins" && <AdminManagement />}
    </View>
  );
}

function AdminActivity() {
  const { c } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/api/admin/activity")
      .then(setLogs)
      .catch(() => {});
  }, []);

  return (
    <FlatList
      data={logs}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={[ss.reportItem, { borderBottomColor: c.borderLight }]}>
          <Text style={[ss.reportTitle, { color: c.text }]}>{item.action || item.type || "Activity"}</Text>
          <Text style={[ss.reportMeta, { color: c.textMuted }]}>
            {item.userId ? `User: ${item.username || item.userId}` : ""}
            {item.details ? ` · ${item.details}` : ""}
            {item.timestamp ? ` · ${new Date(item.timestamp).toLocaleString()}` : ""}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 40 }}>No activity logs</Text>
      }
    />
  );
}

function AdminManagement() {
  const { c } = useTheme();
  const [admins, setAdmins] = useState<any[]>([]);
  const [addAdminId, setAddAdminId] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  useEffect(() => {
    api<any[]>("/api/admin/admins")
      .then(setAdmins)
      .catch(() => {});
  }, []);

  const addAdmin = async () => {
    if (!addAdminId.trim()) return;
    try {
      await api("/api/admin/admins", { method: "POST", body: JSON.stringify({ userId: addAdminId.trim() }) });
      setAdminMsg("Admin added successfully");
      setAddAdminId("");
      api<any[]>("/api/admin/admins")
        .then(setAdmins)
        .catch(() => {});
    } catch (e: any) {
      setAdminMsg(e?.message || "Failed to add admin");
    }
  };

  const removeAdmin = (id: string) => {
    Alert.alert("Remove Admin", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          api(`/api/admin/admins/${id}`, { method: "DELETE" })
            .then(() => setAdmins((p) => p.filter((a) => a.id !== id)))
            .catch(() => {});
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: c.borderLight }}>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: "600", marginBottom: 8 }}>Add Admin</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: c.inputBg,
              borderRadius: 10,
              padding: 12,
              color: c.text,
              fontSize: 14,
              borderWidth: 1,
              borderColor: c.border,
            }}
            placeholder="User ID"
            placeholderTextColor={c.textMuted}
            value={addAdminId}
            onChangeText={setAddAdminId}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={{ backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" }}
            onPress={addAdmin}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>Add</Text>
          </TouchableOpacity>
        </View>
        {adminMsg ? (
          <Text style={{ color: adminMsg.includes("success") ? c.success : c.danger, fontSize: 12, marginTop: 4 }}>
            {adminMsg}
          </Text>
        ) : null}
      </View>
      <FlatList
        data={admins}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[ss.userItem, { borderBottomColor: c.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[ss.userName, { color: c.text }]}>{item.username || item.id}</Text>
              <Text style={[ss.userMeta, { color: c.textMuted }]}>{item.isOwner ? "Owner" : "Admin"}</Text>
            </View>
            {!item.isOwner && (
              <TouchableOpacity
                style={[ss.smallBtn, ss.dangerBtn, { backgroundColor: c.danger }]}
                onPress={() => removeAdmin(item.id)}
              >
                <Text style={ss.smallBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 40 }}>No admins</Text>}
      />
    </View>
  );
}

function AdminUsers() {
  const { c } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const data = await api<AdminUser[]>(
          `/api/admin/users?page=${p}&limit=50${search ? `&q=${encodeURIComponent(search)}` : ""}`,
        );
        setUsers(data);
      } catch {}
      setLoading(false);
    },
    [search],
  );

  useEffect(() => {
    loadUsers(page);
  }, [page, loadUsers]);

  const suspendUser = (id: string) => {
    Alert.alert("Suspend User", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        onPress: () => {
          api(`/api/admin/users/${id}/suspend`, { method: "PUT" })
            .then(() => loadUsers(page))
            .catch(() => {});
        },
      },
    ]);
  };

  const deleteUser = (id: string) => {
    Alert.alert("Delete User", "This cannot be undone", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          api(`/api/admin/users/${id}`, { method: "DELETE" })
            .then(() => setUsers((p) => p.filter((u) => u.id !== id)))
            .catch(() => {});
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          style={[
            ss.searchInput,
            { flex: 1, marginBottom: 0, backgroundColor: c.inputBg, borderColor: c.border, color: c.text },
          ]}
          placeholder="Search users..."
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        {search ? (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              setPage(1);
            }}
            style={{ padding: 8 }}
          >
            <X size={16} color={c.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {loading && <ActivityIndicator color={c.accent} style={{ marginVertical: 20 }} />}
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ss.userItem, { borderBottomColor: c.borderLight }]}
            onPress={() => setDetailUser(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[ss.userName, { color: c.text }]}>{item.username}</Text>
              <Text style={[ss.userEmail, { color: c.textSecondary }]}>{item.email}</Text>
              <Text style={[ss.userMeta, { color: c.textMuted }]}>
                {item.isAdmin === "true" ? "Admin" : "User"} · {item.isSuspended === "true" ? "Suspended" : "Active"}
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <TouchableOpacity
                style={[ss.smallBtn, { backgroundColor: c.accent }]}
                onPress={() => suspendUser(item.id)}
              >
                <Text style={ss.smallBtnText}>{item.isSuspended === "true" ? "Unsuspend" : "Suspend"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.smallBtn, ss.dangerBtn, { backgroundColor: c.danger }]}
                onPress={() => deleteUser(item.id)}
              >
                <Text style={ss.smallBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, padding: 12 }}>
        <TouchableOpacity disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
          <Text style={{ color: page <= 1 ? c.textMuted : c.accent, fontSize: 14 }}>Previous</Text>
        </TouchableOpacity>
        <Text style={{ color: c.textSecondary, fontSize: 14 }}>Page {page}</Text>
        <TouchableOpacity disabled={users.length < 50} onPress={() => setPage((p) => p + 1)}>
          <Text style={{ color: users.length < 50 ? c.textMuted : c.accent, fontSize: 14 }}>Next</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={!!detailUser} transparent animationType="fade" onRequestClose={() => setDetailUser(null)}>
        <View style={ss.overlay}>
          <View style={[ss.modal, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
            <Text style={[ss.modalTitle, { color: c.text }]}>User Details</Text>
            {detailUser && (
              <>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                  {detailUser.username}
                </Text>
                <Text style={{ color: c.textSecondary, marginBottom: 4 }}>ID: {detailUser.id}</Text>
                <Text style={{ color: c.textSecondary, marginBottom: 4 }}>Email: {detailUser.email}</Text>
                <Text style={{ color: c.textSecondary, marginBottom: 4 }}>
                  Joined: {new Date(detailUser.createdAt).toLocaleDateString()}
                </Text>
                <Text style={{ color: detailUser.isSuspended === "true" ? c.danger : c.success, marginBottom: 4 }}>
                  Status: {detailUser.isSuspended === "true" ? "Suspended" : "Active"}
                </Text>
                <Text style={{ color: detailUser.isAdmin === "true" ? c.accent : c.textMuted, marginBottom: 16 }}>
                  Role: {detailUser.isAdmin === "true" ? "Admin" : "User"}
                </Text>
              </>
            )}
            <TouchableOpacity style={[ss.btn, { backgroundColor: c.accent }]} onPress={() => setDetailUser(null)}>
              <Text style={ss.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminReports() {
  const { c } = useTheme();
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const loadReports = useCallback(async (status: string) => {
    try {
      const data = await api<any[]>(`/api/admin/reports?status=${status}`);
      setReports(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadReports(filter);
  }, [filter, loadReports]);

  const resolve = (id: string, status: string) => {
    api(`/api/admin/reports/${id}`, { method: "PUT", body: JSON.stringify({ status }) })
      .then(() => setReports((p) => p.filter((r) => r.id !== id)))
      .catch(() => {});
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", padding: 16, gap: 8 }}>
        {["all", "open", "resolved", "dismissed"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              ss.filterChip,
              { backgroundColor: c.surfaceAlt },
              filter === f && [ss.filterChipActive, { backgroundColor: c.accent }],
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[ss.filterChipText, { color: c.textSecondary }, filter === f && ss.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[ss.reportItem, { borderBottomColor: c.borderLight }]}>
            <Text style={[ss.reportTitle, { color: c.text }]}>{item.reason || "Report"}</Text>
            <Text style={[ss.reportMeta, { color: c.textMuted }]}>
              From: {item.reporterId || "unknown"} · Target: {item.targetUserId || "unknown"} ·{" "}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[ss.smallBtn, { backgroundColor: c.accent }]}
                onPress={() => resolve(item.id, "resolved")}
              >
                <Text style={ss.smallBtnText}>Resolve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.smallBtn, { backgroundColor: c.textSecondary }]}
                onPress={() => resolve(item.id, "dismissed")}
              >
                <Text style={ss.smallBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 40 }}>No reports</Text>}
      />
    </View>
  );
}

function AdminBans() {
  const { c } = useTheme();
  const [bans, setBans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<any[]>(`/api/admin/bans?page=${page}&limit=50${search ? `&q=${encodeURIComponent(search)}` : ""}`)
      .then(setBans)
      .catch(() => {});
  }, [page, search]);

  const unban = (id: string) => {
    api(`/api/admin/bans/${id}`, { method: "DELETE" })
      .then(() => setBans((p) => p.filter((b) => b.id !== id)))
      .catch(() => {});
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        style={[ss.searchInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
        placeholder="Search bans..."
        placeholderTextColor={c.textMuted}
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <FlatList
        data={bans}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <View style={[ss.reportItem, { borderBottomColor: c.borderLight }]}>
            <Text style={[ss.reportTitle, { color: c.text }]}>{item.userId}</Text>
            <Text style={[ss.reportMeta, { color: c.textMuted }]}>
              {item.reason || "No reason"} ·{" "}
              {item.expiresAt ? `Expires: ${new Date(item.expiresAt).toLocaleDateString()}` : "Permanent"}
            </Text>
            <TouchableOpacity style={[ss.smallBtn, { backgroundColor: c.accent }]} onPress={() => unban(item.id)}>
              <Text style={ss.smallBtnText}>Unban</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 40 }}>No bans</Text>}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, padding: 12 }}>
        <TouchableOpacity disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
          <Text style={{ color: page <= 1 ? c.textMuted : c.accent, fontSize: 14 }}>Previous</Text>
        </TouchableOpacity>
        <Text style={{ color: c.textSecondary, fontSize: 14 }}>Page {page}</Text>
        <TouchableOpacity disabled={bans.length < 50} onPress={() => setPage((p) => p + 1)}>
          <Text style={{ color: bans.length < 50 ? c.textMuted : c.accent, fontSize: 14 }}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCard: {
    width: "45%",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    flex: 1,
    minWidth: 140,
  },
  statValue: { fontSize: 28, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 4 },
  searchInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterChipActive: {},
  filterChipText: { fontSize: 13 },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600" },
  userItem: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  userName: { fontSize: 15, fontWeight: "500" },
  userEmail: { fontSize: 13 },
  userMeta: { fontSize: 11, marginTop: 2 },
  smallBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  dangerBtn: {},
  smallBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  reportItem: { padding: 14, borderBottomWidth: 1 },
  reportTitle: { fontSize: 15, fontWeight: "500" },
  reportMeta: { fontSize: 12, marginTop: 4, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: "500" },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "600" },
  tabsRow: { borderBottomWidth: 1 },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  tabActive: {},
  tabText: { fontSize: 13 },
  tabTextActive: { color: "#FFFFFF", fontWeight: "600" },
  content: { flex: 1 },
});
