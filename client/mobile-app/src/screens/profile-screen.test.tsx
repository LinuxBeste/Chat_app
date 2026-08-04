import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ProfileScreen } from "./profile-screen"
import { AuthProvider } from "../lib/auth-context"
import type { ReactNode } from "react"

const mockApi = vi.fn((..._args: any[]) => Promise.resolve({}))

vi.mock("../lib/api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(() => Promise.resolve({ avatar: "/uploads/avatars/a.jpg" })),
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

describe("ProfileScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the profile title", () => {
    render(<ProfileScreen onBack={vi.fn()} />, { wrapper })
    expect(screen.getByText("Profile")).toBeInTheDocument()
  })

  it("renders a back button", () => {
    const onBack = vi.fn()
    render(<ProfileScreen onBack={onBack} />, { wrapper })
    expect(onBack).not.toHaveBeenCalled()
  })
})
