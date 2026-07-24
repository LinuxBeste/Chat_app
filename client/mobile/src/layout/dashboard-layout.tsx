import { useState, createContext, useContext, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { useAuth } from "../../../web/src/lib/auth-context"
import { useTheme } from "../../../web/src/lib/theme-context"
import { useNotificationCount } from "../../../web/src/lib/notification-context"
import { ChatWindow } from "../../../web/src/components/chat/chat-window"
import { ProfilePage } from "../../../web/src/components/profile/profile-page"
import { FilesPage } from "../../../web/src/components/files/files-page"
import { GroupsPage } from "../../../web/src/components/groups/groups-page"
import { CommunitiesPage } from "../../../web/src/components/communities/communities-page"
import { EventsPage } from "../../../web/src/components/events/events-page"
import { NotificationsPage } from "../../../web/src/components/notifications/notifications-page"
import { SettingsPage } from "../../../web/src/components/settings/settings-page"
import { CallsPage } from "../../../web/src/components/calls/calls-page"
import { AdminPage } from "../../../web/src/components/admin/admin-page"

export type View =
  | "chat" | "profile" | "files" | "groups" | "calls"
  | "notifications" | "communities" | "events" | "settings" | "admin"

interface NavContextValue {
  view: View
  setView: (v: View) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) {
    return {
      view: "chat" as View,
      setView: () => {},
      activeConversationId: null,
      setActiveConversationId: () => {},
    }
  }
  return ctx
}

function renderPage(
  view: View,
  activeConversationId: string | null,
  onConversationChange: (id: string | null) => void,
) {
  switch (view) {
    case "chat":
      return <ChatWindow activeConversationId={activeConversationId} onConversationChange={onConversationChange} />
    case "profile":
      return <ProfilePage />
    case "files":
      return <FilesPage />
    case "groups":
      return <GroupsPage />
    case "communities":
      return <CommunitiesPage />
    case "events":
      return <EventsPage />
    case "notifications":
      return <NotificationsPage />
    case "settings":
      return <SettingsPage />
    case "calls":
      return <CallsPage />
    case "admin":
      return <AdminPage />
  }
}

interface DashboardLayoutProps {
  renderOverride?: (view: View, activeConversationId: string | null, onConversationChange: (id: string | null) => void) => ReactNode
}

export function DashboardLayout({ renderOverride }: DashboardLayoutProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { unreadCount } = useNotificationCount()

  const [collapsed, setCollapsed] = useState(false)
  const [view, setView] = useState<View>("chat")
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  const displayName = user?.displayName || user?.username || "User"
  const initials = (displayName.match(/\b\w/g) || []).join("").slice(0, 2).toUpperCase() || "U"

  return (
    <NavContext.Provider value={{ view, setView, activeConversationId, setActiveConversationId }}>
      <div className="flex h-screen bg-bg-secondary overflow-hidden overscroll-contain">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onMobileClose={closeMobile}
          isAdmin={user?.isAdmin}
          unreadCount={unreadCount}
          onLogout={logout}
        />

        <div className="flex flex-1 flex-col min-w-0">
          <Topbar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            onOpenMobile={() => setMobileOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
            displayName={displayName}
            initials={initials}
            searchPlaceholder={t("chat.searchPlaceholder")}
          />

          <main className="flex-1 overflow-hidden lg:rounded-tl-[32px] bg-bg-primary lg:m-3">
            {renderOverride
              ? renderOverride(view, activeConversationId, setActiveConversationId)
              : renderPage(view, activeConversationId, setActiveConversationId)
            }
          </main>
        </div>
      </div>
    </NavContext.Provider>
  )
}
