import { useTranslation } from "react-i18next";
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
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../web/src/lib/utils";
import { useNav, type View } from "./dashboard-layout";

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  view: View;
}

interface BottomItem {
  icon: LucideIcon;
  labelKey: string;
  action: "profile" | "settings" | "logout";
}

export const navItems: NavItem[] = [
  { icon: MessageSquare, labelKey: "nav.messages", view: "chat" },
  { icon: Globe, labelKey: "nav.communities", view: "communities" },
  { icon: Calendar, labelKey: "nav.events", view: "events" },
  { icon: Users, labelKey: "nav.groups", view: "groups" },
  { icon: Phone, labelKey: "nav.calls", view: "calls" },
  { icon: FileText, labelKey: "nav.files", view: "files" },
  { icon: Bell, labelKey: "nav.notifications", view: "notifications" },
  { icon: Shield, labelKey: "nav.admin", view: "admin" },
];

export const bottomItems: BottomItem[] = [
  { icon: User, labelKey: "nav.profile", action: "profile" },
  { icon: Settings, labelKey: "nav.settings", action: "settings" },
  { icon: LogOut, labelKey: "nav.logout", action: "logout" },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isAdmin?: boolean;
  unreadCount: number;
  onLogout: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose, isAdmin, unreadCount, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const { view, setView } = useNav();

  const visibleNavItems = navItems.filter((item) => item.view !== "admin" || isAdmin);

  const handleNavClick = (v: View) => {
    setView(v);
    onMobileClose();
  };

  const handleBottomClick = (action: string) => {
    if (action === "profile") setView("profile");
    if (action === "settings") setView("settings");
    if (action === "logout") onLogout();
    onMobileClose();
  };

  const content = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-4 border-b border-border">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white text-sm font-bold shrink-0"
          aria-hidden="true"
        >
          C
        </div>
        {!collapsed && <span className="text-sm font-semibold text-text-primary truncate">{t("nav.chatApp")}</span>}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer"
            aria-label={t("nav.close")}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1" aria-label={t("nav.mainMenu")}>
        {visibleNavItems.map((item) => (
          <button
            key={item.labelKey}
            onClick={() => handleNavClick(item.view)}
            aria-current={view === item.view ? "page" : undefined}
            aria-label={t(item.labelKey)}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary",
              view === item.view
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-white/5",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            {item.labelKey === "nav.notifications" && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-1 shrink-0" role="group" aria-label={t("nav.userMenu")}>
        {bottomItems.map((item) => (
          <button
            key={item.labelKey}
            onClick={() => handleBottomClick(item.action)}
            aria-label={t(item.labelKey)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <aside
        aria-label={t("nav.mainNav")}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-bg-secondary border-r border-border transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {content}
      </aside>

      <aside
        aria-label={t("nav.mainNav")}
        className={cn(
          "hidden lg:flex lg:flex-col bg-bg-secondary border-r border-border transition-all duration-300 rounded-tl-[32px]",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {content}
      </aside>
    </>
  );
}
