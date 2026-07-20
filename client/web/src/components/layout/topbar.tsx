import { Search, ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react"
import { Avatar } from "../ui/avatar"
import { Input } from "../ui/input"

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Topbar({ collapsed, onToggle }: TopbarProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-bg-secondary px-6">
      <button
        onClick={onToggle}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200 cursor-pointer"
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input placeholder="Search messages, groups..." className="pl-10" />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 cursor-pointer">
          <Avatar size="sm" fallback="JD" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-text-primary">John Doe</p>
            <p className="text-xs text-text-muted">Online</p>
          </div>
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </div>
      </div>
    </header>
  )
}
