import { useState } from "react"
import { AuthProvider, useAuth } from "./lib/auth-context"
import { LoginScreen } from "./screens/login-screen"
import { ConversationsScreen } from "./screens/conversations-screen"
import { ChatScreen } from "./screens/chat-screen"
import { ActivityIndicator, View } from "react-native"

function AppContent() {
  const { user, loading } = useAuth()
  const [activeConv, setActiveConv] = useState<string | null>(null)

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0E1116" }}>
        <ActivityIndicator color="#4850BB" />
      </View>
    )
  }

  if (!user) return <LoginScreen />
  if (activeConv) return <ChatScreen conversationId={activeConv} userId={user.id} onBack={() => setActiveConv(null)} />
  return <ConversationsScreen onSelect={setActiveConv} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
