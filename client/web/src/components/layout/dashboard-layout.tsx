import { useState, createContext, useContext, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { ChatWindow } from "../chat/chat-window"
import { ProfilePage } from "../profile/profile-page"
import { FilesPage } from "../files/files-page"
import { GroupsPage } from "../groups/groups-page"
import { CommunitiesPage } from "../communities/communities-page"
import { EventsPage } from "../events/events-page"
import { NotificationsPage } from "../notifications/notifications-page"
import { SettingsPage } from "../settings/settings-page"
import { CallsPage } from "../calls/calls-page"
import { AdminPage } from "../admin/admin-page"
import { useTheme } from "../../lib/theme-context"

export type View =
  "chat" | "profile" | "files" | "groups" | "calls" | "notifications" | "communities" | "events" | "settings" | "admin"

interface NavContextValue {
  view: View
  setView: (v: View) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx)
    return { view: "chat" as View, setView: () => {}, activeConversationId: null, setActiveConversationId: () => {} }
  return ctx
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [view, setView] = useState<View>("chat")
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const { toggleTheme } = useTheme()

  useEffect(() => {
    const cleanup = window.electronAPI?.onMenuAction((action) => {
      switch (action) {
        case "go-friends":
          setView("chat")
          break
        case "go-settings":
          setView("settings")
          break
        case "go-communities":
          setView("communities")
          break
        case "go-notifications":
          setView("notifications")
          break
        case "go-files":
          setView("files")
          break
        case "go-groups":
          setView("groups")
          break
        case "go-events":
          setView("events")
          break
        case "toggle-sidebar":
          setCollapsed((c) => !c)
          break
        case "toggle-dark-mode":
          toggleTheme()
          break
      }
    })
    return () => cleanup?.()
  }, [toggleTheme])

  return (
    <NavContext.Provider value={{ view, setView, activeConversationId, setActiveConversationId }}>
      <div className="flex h-screen bg-bg-secondary">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <div className="flex flex-1 flex-col min-w-0 rounded-tr-[32px]">
          <Topbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

          <main className="flex-1 overflow-hidden rounded-[32px] bg-bg-primary m-3">
            {view === "chat" && (
              <ChatWindow activeConversationId={activeConversationId} onConversationChange={setActiveConversationId} />
            )}
            {view === "profile" && <ProfilePage />}
            {view === "files" && <FilesPage />}
            {view === "groups" && <GroupsPage />}
            {view === "communities" && <CommunitiesPage />}
            {view === "events" && <EventsPage />}
            {view === "notifications" && <NotificationsPage />}
            {view === "settings" && <SettingsPage />}
            {view === "calls" && <CallsPage />}
            {view === "admin" && <AdminPage />}
          </main>
        </div>
      </div>
    </NavContext.Provider>
  )
}
