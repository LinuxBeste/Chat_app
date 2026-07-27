import { useState } from "react"
import { Search, ChevronDown, PanelLeftClose, PanelLeft, Menu, Moon, Sun } from "lucide-react"
import { SearchPanel } from "../../../web/src/components/search/search-panel"

interface TopbarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenMobile: () => void
  theme: "light" | "dark"
  onToggleTheme: () => void
  displayName: string
  initials: string
  searchPlaceholder: string
}

export function Topbar({
  collapsed,
  onToggleCollapse,
  onOpenMobile,
  theme,
  onToggleTheme,
  displayName,
  initials,
  searchPlaceholder,
}: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg-secondary px-4 lg:px-6">
      <button
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer"
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-10 w-full items-center rounded-2xl border border-border bg-transparent px-10 text-sm text-text-muted text-left cursor-pointer hover:border-accent/50 transition-colors duration-200"
        >
          {searchPlaceholder}
        </button>
        {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-semibold"
              aria-hidden="true"
            >
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-online border-2 border-bg-secondary" />
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-medium text-text-primary truncate max-w-[120px]">{displayName}</p>
            <p className="text-xs text-text-muted">Online</p>
          </div>
          <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />
        </div>
      </div>
    </header>
  )
}
