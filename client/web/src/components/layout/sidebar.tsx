import { cn } from "../../lib/utils"
import {
  MessageSquare,
  Users,
  Hash,
  Phone,
  Bell,
  User,
  Settings,
  LogOut,
} from "lucide-react"
import { useNotificationCount } from "../../lib/notification-context"
import { useNav } from "./dashboard-layout"

const navItems = [
  { icon: MessageSquare, label: "Messages", active: true },
  { icon: Users, label: "Groups", active: false },
  { icon: Hash, label: "Channels", active: false },
  { icon: Phone, label: "Calls", active: false },
  { icon: Bell, label: "Notifications", active: false },
]

const bottomItems = [
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
  { icon: LogOut, label: "Logout" },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { unreadCount } = useNotificationCount()
  const { setView } = useNav()

  const handleBottomClick = (label: string) => {
    if (label === "Profile") setView("profile")
  }

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "flex flex-col bg-bg-secondary border-r border-border transition-all duration-300 rounded-tl-[32px]",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white text-sm font-bold shrink-0" aria-hidden="true">
          C
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-text-primary">Chat App</span>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3" aria-label="Main menu">
        {navItems.map((item) => (
          <button
            key={item.label}
            aria-current={item.active ? "page" : undefined}
            aria-label={item.label}
            className={cn(
              "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary",
              item.active
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-white/5",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label === "Notifications" && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3 flex flex-col gap-1" role="group" aria-label="User menu">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            onClick={() => handleBottomClick(item.label)}
            aria-label={item.label}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </aside>
  )
}
