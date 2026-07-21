import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "./auth-context"

vi.mock("./api", () => ({
  api: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getTokens: vi.fn(() => ({ accessToken: null, refreshToken: null })),
}))

vi.mock("./ws", () => ({
  wsClient: { connect: vi.fn(), disconnect: vi.fn() },
}))

import { api } from "./api"
import { wsClient } from "./ws"

function TestComponent() {
  const { user, loading, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="user">{user ? user.username : "null"}</span>
      <button data-testid="login" onClick={() => login("a@b.com", "pass")}>
        Login
      </button>
      <button data-testid="register" onClick={() => register("u", "a@b.com", "pass")}>
        Register
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  )
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("starts with loading and no user", () => {
    renderWithProvider()
    expect(screen.getByTestId("loading").textContent).toBe("loaded")
    expect(screen.getByTestId("user").textContent).toBe("null")
  })

  it("logs in and sets user", async () => {
    const mockUser = { id: "1", username: "testuser", email: "a@b.com" }
    vi.mocked(api).mockResolvedValueOnce({
      user: mockUser,
      accessToken: "at",
      refreshToken: "rt",
    })

    renderWithProvider()
    await act(async () => {
      screen.getByTestId("login").click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("testuser")
    })
    expect(wsClient.connect).toHaveBeenCalled()
  })

  it("registers and sets user", async () => {
    const mockUser = { id: "1", username: "newuser", email: "a@b.com" }
    vi.mocked(api).mockResolvedValueOnce({
      user: mockUser,
      accessToken: "at",
      refreshToken: "rt",
    })

    renderWithProvider()
    await act(async () => {
      screen.getByTestId("register").click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("newuser")
    })
  })

  it("logs out and clears user", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      user: { id: "1", username: "testuser", email: "a@b.com" },
      accessToken: "at",
      refreshToken: "rt",
    })

    renderWithProvider()
    await act(async () => {
      screen.getByTestId("login").click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("testuser")
    })

    await act(async () => {
      screen.getByTestId("logout").click()
    })

    expect(screen.getByTestId("user").textContent).toBe("null")
  })
})
