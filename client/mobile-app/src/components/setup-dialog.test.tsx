import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SetupDialog } from "./setup-dialog"
import { AuthProvider } from "../lib/auth-context"
import type { ReactNode } from "react"

const mockApi = vi.fn()

vi.mock("../lib/api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(),
  BASE_URL: "http://localhost:3000",
}))

vi.mock("../lib/crypto", () => ({
  getOrCreateKeyPair: vi.fn(() => Promise.resolve({ publicKey: "pk", secretKey: "sk" })),
  deleteKeyPair: vi.fn(() => Promise.resolve()),
}))

vi.mock("../lib/ws", () => ({
  wsClient: { connect: vi.fn(), disconnect: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe("SetupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.mockResolvedValue({})
  })

  it("renders welcome step by default", () => {
    render(<SetupDialog />, { wrapper })
    expect(screen.getByText("Welcome!")).toBeInTheDocument()
  })

  it("advances to language step on next", () => {
    render(<SetupDialog />, { wrapper })
    fireEvent.click(screen.getByText("Next").closest("button")!)
    expect(screen.getByText("Choose Language")).toBeInTheDocument()
  })

  it("advances to theme step", () => {
    render(<SetupDialog />, { wrapper })
    fireEvent.click(screen.getByText("Next").closest("button")!)
    fireEvent.click(screen.getByText("Next").closest("button")!)
    expect(screen.getByText("Choose Theme")).toBeInTheDocument()
  })

  it("advances to display name step", () => {
    render(<SetupDialog />, { wrapper })
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText("Next").closest("button")!)
    }
    expect(screen.getByText("Display Name")).toBeInTheDocument()
  })

  it("shows language options", () => {
    render(<SetupDialog />, { wrapper })
    fireEvent.click(screen.getByText("Next").closest("button")!)
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByText("Deutsch")).toBeInTheDocument()
  })

  it("shows skip button and calls completeSetup", () => {
    render(<SetupDialog />, { wrapper })
    expect(screen.getByText("Skip")).toBeInTheDocument()
  })

  it("renders progress indicators", () => {
    render(<SetupDialog />, { wrapper })
    expect(screen.getByText("1 / 4")).toBeInTheDocument()
  })
})
