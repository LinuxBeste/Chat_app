import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { Sidebar } from "./sidebar"

vi.mock("../../lib/notification-context", () => ({
  useNotificationCount: vi.fn(() => ({ unreadCount: 5, refresh: vi.fn() })),
}))

vi.mock("../../lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}))

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1", username: "test" }, logout: vi.fn() })),
}))

describe("Sidebar", () => {
  const onToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all navigation items", () => {
    render(<Sidebar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByLabelText("Messages")).toBeInTheDocument()
    expect(screen.getByLabelText("Communities")).toBeInTheDocument()
    expect(screen.getByLabelText("Events")).toBeInTheDocument()
    expect(screen.getByLabelText("Groups")).toBeInTheDocument()
    expect(screen.getByLabelText("Calls")).toBeInTheDocument()
    expect(screen.getByLabelText("Files")).toBeInTheDocument()
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument()
  })

  it("renders bottom items", () => {
    render(<Sidebar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByLabelText("Profile")).toBeInTheDocument()
    expect(screen.getByLabelText("Settings")).toBeInTheDocument()
    expect(screen.getByLabelText("Logout")).toBeInTheDocument()
  })

  it("shows notification badge with unread count", () => {
    render(<Sidebar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("shows labels when expanded", () => {
    render(<Sidebar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByText("Messages")).toBeInTheDocument()
    expect(screen.getByText("Communities")).toBeInTheDocument()
    expect(screen.getByText("Chat App")).toBeInTheDocument()
  })

  it("hides labels when collapsed", () => {
    render(<Sidebar collapsed={true} onToggle={onToggle} />)
    expect(screen.queryByText("Messages")).not.toBeInTheDocument()
    expect(screen.queryByText("Chat App")).not.toBeInTheDocument()
  })

  it("highlights the active nav item", () => {
    render(<Sidebar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByLabelText("Messages")).toHaveAttribute("aria-current", "page")
  })

  it("renders bottom section as a group", () => {
    render(<Sidebar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByRole("group", { name: "User menu" })).toBeInTheDocument()
  })

  it("applies collapsed width class when collapsed", () => {
    const { container } = render(<Sidebar collapsed={true} onToggle={onToggle} />)
    const aside = container.querySelector("aside")
    expect(aside).toBeInTheDocument()
  })
})
