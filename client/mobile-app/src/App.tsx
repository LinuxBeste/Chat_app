import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native"
import {
  MessageSquare,
  Users,
  Globe,
  Folder,
  Bell,
  Phone,
  User,
  Settings,
  Calendar,
  Search,
  Shield,
  ChevronRight,
  LogOut,
} from "lucide-react-native"
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider, useAuth } from "./lib/auth-context"
import { ToastProvider } from "./lib/toast-context"
import { NotificationProvider, useNotificationCount } from "./lib/notification-context"
import { NavProvider, useNav, type NavView } from "./lib/nav-context"
import { ThemeProvider, useTheme } from "./lib/theme-context"
import { wsClient } from "./lib/ws"
import { LoginScreen } from "./screens/login-screen"
import { ConversationsScreen } from "./screens/conversations-screen"
import { ChatScreen } from "./screens/chat-screen"
import { GroupsScreen } from "./screens/groups-screen"
import { CommunitiesScreen } from "./screens/communities-screen"
import { FilesScreen } from "./screens/files-screen"
import { NotificationsScreen } from "./screens/notifications-screen"
import { CallsScreen } from "./screens/calls-screen"
import { ProfileScreen } from "./screens/profile-screen"
import { SettingsScreen } from "./screens/settings-screen"
import { EventsScreen } from "./screens/events-screen"
import { AdminScreen } from "./screens/admin-screen"
import { SearchScreen } from "./screens/search-screen"
import { SetupDialog } from "./components/setup-dialog"
import { StatusSelector } from "./components/status-selector"
import { CallOverlay } from "./components/call-overlay"
import { Badge } from "./components/ui/badge"
import { Avatar } from "./components/ui/avatar"
import "./lib/i18n"
import { useTranslation } from "react-i18next"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 83 : 64
const TOP_BAR_HEIGHT = Platform.OS === "ios" ? 100 : 56

type Tab = "chats" | "groups" | "communities" | "files" | "notifications" | "calls"

const tabs: { key: Tab; label: string; icon: typeof MessageSquare; badge?: boolean }[] = [
  { key: "chats", label: "Chats", icon: MessageSquare },
  { key: "groups", label: "Groups", icon: Users },
  { key: "communities", label: "Communities", icon: Globe },
  { key: "files", label: "Files", icon: Folder },
  { key: "notifications", label: "Alerts", icon: Bell, badge: true },
  { key: "calls", label: "Calls", icon: Phone },
]

function MoreSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { view, setView } = useNav()

  const menuItems = [
    { label: "Profile", icon: User, desc: "Edit your profile", view: "profile" as NavView },
    { label: "Settings", icon: Settings, desc: "App preferences", view: "settings" as NavView },
    { label: "Events", icon: Calendar, desc: "Upcoming events", view: "events" as NavView },
    { label: "Search", icon: Search, desc: "Search messages", view: "search" as NavView },
  ]
  if (user?.isAdmin) {
    menuItems.push({ label: "Admin", icon: Shield, desc: "Server administration", view: "admin" as NavView })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose}>
        <View />
      </TouchableOpacity>
      <View style={ms.sheet}>
        <View style={ms.handle} />
        <View style={ms.userRow}>
          <Avatar name={user?.displayName || user?.username} size={48} />
          <View style={ms.userInfo}>
            <Text style={ms.userName}>{user?.displayName || user?.username}</Text>
            <StatusSelector />
          </View>
        </View>
        <View style={ms.divider} />
        <ScrollView style={ms.items}>
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <TouchableOpacity
                key={item.view}
                style={[ms.item, view === item.view && ms.itemActive]}
                onPress={() => {
                  setView(item.view)
                  onClose()
                }}
              >
                <View style={ms.itemIconWrap}>
                  <Icon size={20} color={view === item.view ? "#6C8CFF" : "#E8E8F0"} />
                </View>
                <View style={ms.itemContent}>
                  <Text style={[ms.itemLabel, view === item.view && ms.itemLabelActive]}>{item.label}</Text>
                  <Text style={ms.itemDesc}>{item.desc}</Text>
                </View>
                <ChevronRight size={18} color="#585870" />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        <View style={ms.divider} />
        <TouchableOpacity style={ms.logoutBtn} onPress={logout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={ms.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

function TabIcon({
  icon: Icon,
  active,
  badgeCount,
}: {
  icon: typeof MessageSquare
  active: boolean
  badgeCount?: number
}) {
  return (
    <View style={ti.container}>
      <Icon size={22} color={active ? "#6C8CFF" : "#585870"} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={ti.badge}>
          <Text style={ti.badgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
        </View>
      )}
    </View>
  )
}

function HomeContent() {
  const { user } = useAuth()
  const { view, setView, activeConversationId, setActiveConversationId } = useNav()
  const { unreadCount } = useNotificationCount()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<Tab>("chats")
  const [moreOpen, setMoreOpen] = useState(false)
  const [incomingCall, setIncomingCall] = useState<{ conversationId: string; type: "voice" | "video" } | null>(null)

  useEffect(() => {
    const unsub = wsClient.on("call:offer", (data: any) => {
      setIncomingCall({ conversationId: data.conversationId, type: data.type || "voice" })
    })
    return unsub
  }, [])

  if (view === "profile") return <ProfileScreen onBack={() => setView("chats")} />
  if (view === "settings") return <SettingsScreen onBack={() => setView("chats")} />
  if (view === "events")
    return (
      <EventsScreen
        onSelectChat={(id) => {
          setActiveConversationId(id)
          setView("chats")
          setActiveTab("chats")
        }}
      />
    )
  if (view === "admin") return <AdminScreen onBack={() => setView("chats")} />
  if (view === "search")
    return (
      <SearchScreen
        onBack={() => setView("chats")}
        onSelect={(id) => {
          setActiveConversationId(id)
          setView("chats")
          setActiveTab("chats")
        }}
      />
    )
  if (activeConversationId)
    return <ChatScreen conversationId={activeConversationId} onBack={() => setActiveConversationId(null)} />

  const renderScreen = () => {
    switch (activeTab) {
      case "chats":
        return <ConversationsScreen onSelect={(id) => setActiveConversationId(id)} />
      case "groups":
        return <GroupsScreen onSelectChat={(id) => setActiveConversationId(id)} />
      case "communities":
        return <CommunitiesScreen onSelectChat={(id) => setActiveConversationId(id)} />
      case "files":
        return <FilesScreen />
      case "notifications":
        return <NotificationsScreen />
      case "calls":
        return <CallsScreen />
    }
  }

  return (
    <View style={hc.container}>
      <View style={[hc.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={hc.topBarLeft}>
          <Text style={hc.appTitle}>Chats</Text>
        </View>
        <View style={hc.topBarRight}>
          <TouchableOpacity style={hc.iconBtn} onPress={() => setView("search")}>
            <Search size={18} color="#8888A0" />
          </TouchableOpacity>
          <TouchableOpacity style={hc.iconBtn} onPress={() => setMoreOpen(true)}>
            <Avatar name={user?.displayName || user?.username} size={32} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={hc.content}>{renderScreen()}</View>
      <View style={hc.tabBar}>
        {tabs.map((t) => {
          const isActive = activeTab === t.key
          return (
            <TouchableOpacity key={t.key} style={hc.tab} onPress={() => setActiveTab(t.key)} activeOpacity={0.6}>
              <TabIcon icon={t.icon} active={isActive} badgeCount={t.badge ? unreadCount : undefined} />
              <Text style={[hc.tabLabel, isActive && hc.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
      {incomingCall && (
        <CallOverlay
          incoming
          conversationId={incomingCall.conversationId}
          type={incomingCall.type}
          onEnd={() => setIncomingCall(null)}
        />
      )}
    </View>
  )
}

function AppContent() {
  const { user, loading, needsSetup } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0A0F" }}>
        <ActivityIndicator color="#6C8CFF" size="large" />
      </View>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <>
      <HomeContent />
      {needsSetup && <SetupDialog />}
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <NavProvider>
                <AppContent />
              </NavProvider>
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const ti = StyleSheet.create({
  container: { position: "relative", alignItems: "center", justifyContent: "center" },
  active: { opacity: 1 },
  badge: {
    position: "absolute",
    top: -6,
    right: -12,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
})

const hc = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#0A0A0F",
    borderBottomWidth: 1,
    borderBottomColor: "#181825",
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  appTitle: { fontSize: 28, fontWeight: "800", color: "#E8E8F0", letterSpacing: -0.5 },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181825",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#252538",
  },
  content: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0E0E14",
    borderTopWidth: 1,
    borderTopColor: "#181825",
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  tabLabel: { color: "#585870", fontSize: 10, marginTop: 3, fontWeight: "500" },
  tabLabelActive: { color: "#6C8CFF" },
})

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0E0E14",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "#252538",
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#252538",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  userRow: { flexDirection: "row", alignItems: "center", padding: 20, gap: 14 },
  userInfo: { flex: 1 },
  userName: { color: "#E8E8F0", fontSize: 17, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#181825" },
  items: { maxHeight: 300 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 },
  itemActive: { backgroundColor: "rgba(108,140,255,0.08)" },
  itemIconWrap: { width: 32, alignItems: "center", justifyContent: "center" },
  itemContent: { flex: 1, marginLeft: 14 },
  itemLabel: { color: "#E8E8F0", fontSize: 15, fontWeight: "500" },
  itemLabelActive: { color: "#6C8CFF" },
  itemDesc: { color: "#585870", fontSize: 12, marginTop: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", padding: 20, gap: 12 },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "500" },
})
