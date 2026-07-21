import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { AuthProvider, useAuth } from "./lib/auth-context"
import { LoginScreen } from "./screens/login-screen"
import { ConversationsScreen } from "./screens/conversations-screen"
import { ChatScreen } from "./screens/chat-screen"
import { GroupsScreen } from "./screens/groups-screen"
import { FilesScreen } from "./screens/files-screen"
import { NotificationsScreen } from "./screens/notifications-screen"
import { CallsScreen } from "./screens/calls-screen"
import { ActivityIndicator } from "react-native"

type Tab = "chats" | "groups" | "files" | "notifications" | "calls"

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "chats", label: "Chats", icon: "💬" },
  { key: "groups", label: "Groups", icon: "👥" },
  { key: "files", label: "Files", icon: "📄" },
  { key: "notifications", label: "Notifs", icon: "🔔" },
  { key: "calls", label: "Calls", icon: "📞" },
]

function HomeScreen() {
  const [tab, setTab] = useState<Tab>("chats")
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const { user } = useAuth()

  if (activeConv) {
    return <ChatScreen conversationId={activeConv} userId={user!.id} onBack={() => setActiveConv(null)} />
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === "chats" && <ConversationsScreen onSelect={setActiveConv} />}
        {tab === "groups" && <GroupsScreen />}
        {tab === "files" && <FilesScreen />}
        {tab === "notifications" && <NotificationsScreen />}
        {tab === "calls" && <CallsScreen />}
      </View>
      <View style={s.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.key} style={s.tab} onPress={() => setTab(t.key)}>
            <Text style={[s.tabIcon, tab === t.key && s.tabActive]}>{t.icon}</Text>
            <Text style={[s.tabLabel, tab === t.key && s.tabActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0E1116" }}>
        <ActivityIndicator color="#4850BB" />
      </View>
    )
  }

  if (!user) return <LoginScreen />
  return <HomeScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#181B22",
    borderTopWidth: 1,
    borderTopColor: "#2A2F3A",
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabLabel: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
  },
  tabActive: {
    opacity: 1,
    color: "#4850BB",
  },
})
