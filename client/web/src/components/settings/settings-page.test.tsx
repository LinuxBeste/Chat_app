import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { SettingsPage } from "./settings-page"

const mockUser = { id: "user-1", username: "testuser", email: "test@test.com", displayName: "Test User" }

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}))

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

import { api } from "../../lib/api"

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows account info with username and email", async () => {
    vi.mocked(api).mockResolvedValueOnce({ enabled: false })
    vi.mocked(api).mockResolvedValueOnce([])
    render(<SettingsPage />)
    expect(screen.getByText("@testuser")).toBeInTheDocument()
    expect(screen.getByText("test@test.com")).toBeInTheDocument()
  })

  it("shows 2FA section", async () => {
    vi.mocked(api).mockResolvedValueOnce({ enabled: false })
    vi.mocked(api).mockResolvedValueOnce([])
    render(<SettingsPage />)
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument()
  })

  it("shows login history section", async () => {
    const loginEntries = [
      { id: "log-1", ip: "192.168.1.1", userAgent: "Chrome 120", success: "true", createdAt: new Date().toISOString() },
    ]
    vi.mocked(api).mockResolvedValueOnce({ enabled: false })
    vi.mocked(api).mockResolvedValueOnce(loginEntries)
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByText("Chrome")).toBeInTheDocument()
    })
  })

  it("shows Enable 2FA button when 2FA is disabled", async () => {
    vi.mocked(api).mockResolvedValueOnce({ enabled: false })
    vi.mocked(api).mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByText("Enable 2FA")).toBeInTheDocument()
    })
  })

  it("shows Disable 2FA button when 2FA is enabled", async () => {
    vi.mocked(api).mockResolvedValueOnce({ enabled: true })
    vi.mocked(api).mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByText("Disable 2FA")).toBeInTheDocument()
    })
  })

  it("shows active sessions placeholder", async () => {
    vi.mocked(api).mockResolvedValueOnce({ enabled: false })
    vi.mocked(api).mockResolvedValueOnce([])
    render(<SettingsPage />)
    expect(screen.getByText("Active Sessions")).toBeInTheDocument()
    expect(screen.getByText("Session management coming soon.")).toBeInTheDocument()
  })
})
