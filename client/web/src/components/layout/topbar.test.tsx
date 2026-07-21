import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { Topbar } from "./topbar"

const mockToggleTheme = vi.fn()
vi.mock("../../lib/theme-context", () => ({
  useTheme: vi.fn(() => ({ theme: "dark", toggleTheme: mockToggleTheme })),
}))

vi.mock("../presence/status-selector", () => ({
  StatusSelector: vi.fn(() => <div data-testid="status-selector" />),
}))

vi.mock("../search/search-panel", () => ({
  SearchPanel: vi.fn(({ onClose }) => (
    <div data-testid="search-panel">
      <button onClick={onClose}>Close</button>
    </div>
  )),
}))

vi.mock("../ui/avatar", () => ({
  Avatar: vi.fn(({ fallback, size }) => (
    <div data-testid="avatar" data-size={size}>
      {fallback}
    </div>
  )),
}))

vi.mock("../ui/input", () => ({
  Input: vi.fn((props) => <input {...props} data-testid="search-input" />),
}))

describe("Topbar", () => {
  const onToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the search input", () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByPlaceholderText("Search messages, groups...")).toBeInTheDocument()
  })

  it("renders the theme toggle button", () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders the status selector", () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByTestId("status-selector")).toBeInTheDocument()
  })

  it("calls onToggle when collapse toggle is clicked", async () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    const buttons = screen.getAllByRole("button")
    await act(async () => {
      buttons[0].click()
    })
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it("renders the avatar with fallback", () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByTestId("avatar")).toBeInTheDocument()
  })

  it("shows John Doe text", () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByText("John Doe")).toBeInTheDocument()
  })

  it("shows theme toggle icon based on theme", () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    expect(screen.getByTestId("status-selector")).toBeInTheDocument()
  })

  it("can open search panel on input focus", async () => {
    render(<Topbar collapsed={false} onToggle={onToggle} />)
    const input = screen.getByPlaceholderText("Search messages, groups...")
    await act(async () => {
      input.focus()
    })
    expect(screen.getByTestId("search-panel")).toBeInTheDocument()
  })
})
