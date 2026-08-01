import { AuthProvider, useAuth } from "./lib/auth-context"
import { ThemeProvider } from "./lib/theme-context"
import { NotificationProvider } from "./lib/notification-context"
import { ToastProvider } from "./lib/toast-context"
import { isDesktop } from "./lib/utils"
import { DashboardLayout } from "../../mobile/src/layout/dashboard-layout"
import { LoginPage } from "./components/auth/login-page"
import { SetupDialog } from "./components/auth/setup-dialog"
import { WifiOff, RefreshCw } from "lucide-react"
import { useState } from "react"
import "./lib/i18n"

function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false)

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-bg-primary px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <WifiOff className="h-6 w-6 text-accent" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-text-primary">You're offline</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-text-muted">Reconnect to continue. Your session is safe.</p>
      <button
        onClick={async () => {
          setRetrying(true)
          await onRetry()
          setRetrying(false)
        }}
        disabled={retrying}
        className="mt-6 flex h-11 items-center gap-2 rounded-2xl bg-accent px-6 text-sm font-medium text-white hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Connecting..." : "Try again"}
      </button>
    </div>
  )
}

function AppContent() {
  const { user, loading, offline, retry, needsSetup } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    )
  }

  if (offline && !user && isDesktop()) return <OfflineScreen onRetry={retry} />

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
