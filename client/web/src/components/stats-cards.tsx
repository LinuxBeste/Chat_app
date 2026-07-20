import { Card } from "./ui/card"
import { MessageSquare, Users, Phone, Clock } from "lucide-react"

const stats = [
  { icon: MessageSquare, label: "Total Messages", value: "12,845", change: "+12%", up: true },
  { icon: Users, label: "Active Users", value: "1,429", change: "+8%", up: true },
  { icon: Phone, label: "Call Minutes", value: "3,210", change: "-3%", up: false },
  { icon: Clock, label: "Avg Response", value: "1.4m", change: "-5%", up: true },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} hover className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10">
              <stat.icon className="h-5 w-5 text-accent" />
            </div>
            <span className={`text-xs font-medium ${stat.up ? "text-green-400" : "text-red-400"}`}>
              {stat.change}
            </span>
          </div>
          <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
          <p className="text-sm text-text-muted mt-0.5">{stat.label}</p>
        </Card>
      ))}
    </div>
  )
}
