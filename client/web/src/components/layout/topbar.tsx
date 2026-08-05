import { useTranslation } from "react-i18next";
import { Search, ChevronDown, PanelLeftClose, PanelLeft, Moon, Sun } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { Input } from "../ui/input";
import { useTheme } from "../../lib/theme-context";
import { useAuth } from "../../lib/auth-context";
import { StatusSelector } from "../presence/status-selector";
import { SearchPanel } from "../search/search-panel";
import { useState, useRef, useEffect } from "react";

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Topbar({ collapsed, onToggle }: TopbarProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const displayName = user?.displayName || user?.username || "User";
  const initials = (displayName.match(/\b\w/g) || []).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-bg-secondary px-6">
      <button
        onClick={onToggle}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer"
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <Input
          placeholder={t("chat.searchPlaceholder")}
          className="pl-10"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeSearch();
          }}
        />
        {searchOpen && <SearchPanel query={searchQuery} onChange={setSearchQuery} onClose={closeSearch} />}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2 cursor-pointer">
          <Avatar size="sm" fallback={initials} />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-text-primary">{displayName}</p>
            <StatusSelector />
          </div>
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </div>
      </div>
    </header>
  );
}
