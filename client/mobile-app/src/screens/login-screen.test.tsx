import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LoginScreen } from "./login-screen"
import type { ReactNode } from "react"

vi.mock("../lib/auth-context", async () => {
  const React = await import("react")
  const ce = (React as any).default?.createElement || React.createElement
  return {
    AuthProvider: ({ children }: { children: ReactNode }) => ce(React.Fragment, null, children),
    useAuth: () => ({
      user: null,
      loading: false,
      needsSetup: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      completeSetup: vi.fn(),
    }),
  }
})

vi.mock("../lib/theme-context", async () => {
  const React = await import("react")
  const ce = (React as any).default?.createElement || React.createElement
  return {
    ThemeProvider: ({ children }: { children: ReactNode }) => ce(React.Fragment, null, children),
    useTheme: () => ({
      mode: "dark",
      toggle: vi.fn(),
      c: {
        bg: "#0A0A0F",
        text: "#E8E8F0",
        surface: "#101016",
        border: "#252538",
        primary: "#6C8CFF",
        muted: "#585870",
        card: "#161625",
        error: "#EF4444",
        success: "#22C55E",
        white: "#FFFFFF",
      },
    }),
  }
})

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders login form by default", () => {
    render(<LoginScreen />)
    expect(screen.getByPlaceholderText("Email or username")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
  })

  it("renders register form when toggled", () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText("Register"))
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument()
  })

  it("shows validation error when fields are empty", () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText("Sign In"))
    expect(screen.getByText("Email or username required")).toBeInTheDocument()
  })

  it("toggles password visibility", () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByLabelText("Show password"))
  })

  it("renders brand name", () => {
    render(<LoginScreen />)
    expect(screen.getByText("Chats")).toBeInTheDocument()
  })

  it("shows language picker", () => {
    render(<LoginScreen />)
    expect(screen.getByLabelText("Language")).toBeInTheDocument()
  })

  it("shows theme toggle", () => {
    render(<LoginScreen />)
    expect(screen.getByLabelText("Light")).toBeInTheDocument()
  })
})