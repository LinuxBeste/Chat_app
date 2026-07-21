import { AuthProvider, useAuth } from "./lib/auth-context"
import { ThemeProvider } from "./lib/theme-context"
import { NotificationProvider } from "./lib/notification-context"
import { DashboardLayout } from "./components/layout/dashboard-layout"
import { LoginPage } from "./components/auth/login-page"

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return <DashboardLayout />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
