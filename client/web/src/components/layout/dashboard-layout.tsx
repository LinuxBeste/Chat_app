import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-bg-secondary">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="flex flex-1 flex-col min-w-0 rounded-tr-[32px]">
        <Topbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <main className="flex-1 overflow-hidden rounded-[32px] bg-bg-primary m-3">
          {children}
        </main>
      </div>
    </div>
  )
}
