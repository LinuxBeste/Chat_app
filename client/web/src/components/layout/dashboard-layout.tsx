import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { cn } from "../../lib/utils"

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-bg-secondary">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="flex flex-1 flex-col min-w-0 rounded-tr-[32px]">
        <Topbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <main className="flex-1 overflow-y-auto rounded-[32px] bg-bg-primary p-6 m-3">
          <div className={cn("mx-auto transition-all duration-300", collapsed ? "max-w-7xl" : "max-w-6xl")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
