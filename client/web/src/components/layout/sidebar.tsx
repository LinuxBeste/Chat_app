import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import {
  MessageSquare,
  Users,
  Phone,
  Bell,
  FileText,
  User,
  Settings,
  LogOut,
  Globe,
  Calendar,
  Shield,
} from "lucide-react";
import { useNotificationCount } from "../../lib/notification-context";
import { useNav } from "./dashboard-layout";
import { useAuth } from "../../lib/auth-context";
import type { View } from "./dashboard-layout";

const navItems: { icon: any; labelKey: string; view: View }[] = [
  { icon: MessageSquare, labelKey: "nav.messages", view: "chat" },
  { icon: Globe, labelKey: "nav.communities", view: "communities" },
  { icon: Calendar, labelKey: "nav.events", view: "events" },
  { icon: Users, labelKey: "nav.groups", view: "groups" },
  { icon: Phone, labelKey: "nav.calls", view: "calls" },
  { icon: FileText, labelKey: "nav.files", view: "files" },
  { icon: Bell, labelKey: "nav.notifications", view: "notifications" },
  { icon: Shield, labelKey: "nav.admin", view: "admin" },
];

const bottomItems = [
  { icon: User, labelKey: "nav.profile" },
  { icon: Settings, labelKey: "nav.settings" },
  { icon: LogOut, labelKey: "nav.logout" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { t } = useTranslation();
  const { unreadCount } = useNotificationCount();
  const { view, setView } = useNav();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter((item) => item.view !== "admin" || user?.isAdmin);

  const handleNavClick = (v: View) => setView(v);
  const handleBottomClick = (labelKey: string) => {
    if (labelKey === "nav.profile") setView("profile");
    if (labelKey === "nav.settings") setView("settings");
    if (labelKey === "nav.logout") logout();
  };

  return (
    <aside
      aria-label={t("nav.mainNav")}
      className={cn(
        "flex flex-col bg-bg-secondary border-r border-border transition-all duration-300 rounded-tl-[32px]",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white text-sm font-bold shrink-0"
          aria-hidden="true"
        >
          C
        </div>
        {!collapsed && <span className="text-sm font-semibold text-text-primary">{t("nav.chatApp")}</span>}
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3" aria-label={t("nav.mainMenu")}>
        {filteredNavItems.map((item) => (
          <button
            key={item.labelKey}
            onClick={() => handleNavClick(item.view)}
            aria-current={view === item.view ? "page" : undefined}
            aria-label={t(item.labelKey)}
            className={cn(
              "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary",
              view === item.view
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-white/5",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.labelKey === "nav.notifications" && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3 flex flex-col gap-1" role="group" aria-label={t("nav.userMenu")}>
        {bottomItems.map((item) => (
          <button
            key={item.labelKey}
            onClick={() => handleBottomClick(item.labelKey)}
            aria-label={t(item.labelKey)}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}
