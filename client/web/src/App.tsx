import { AuthProvider, useAuth } from "./lib/auth-context"
import { ThemeProvider } from "./lib/theme-context"
import { NotificationProvider } from "./lib/notification-context"
import { ToastProvider } from "./lib/toast-context"
import { DashboardLayout } from "../../mobile/src/layout/dashboard-layout"
import { LoginPage } from "./components/auth/login-page"
import { SetupDialog } from "./components/auth/setup-dialog"
import "./lib/i18n"

function AppContent() {
  const { user, loading, needsSetup } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <>
      <DashboardLayout />
      {needsSetup && <SetupDialog />}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
