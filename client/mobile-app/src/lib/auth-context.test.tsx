import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "./auth-context"
import { getTokens, clearTokens, NetworkError } from "./api"
import { cacheSet, offlineKeys } from "./offline-cache"
import type { ReactNode } from "react"

const mockApi = vi.fn()
const mockWsConnect = vi.fn()
const mockWsDisconnect = vi.fn()

vi.mock("./api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(),
  NetworkError: class NetworkError extends Error {},
  BASE_URL: "http://localhost:3000",
}))

vi.mock("./ws", () => ({
  wsClient: {
    connect: (...args: any[]) => mockWsConnect(...args),
    disconnect: (...args: any[]) => mockWsDisconnect(...args),
  },
}))

vi.mock("./crypto", () => ({
  getOrCreateKeyPair: vi.fn(() => Promise.resolve({ publicKey: "pk", secretKey: "sk" })),
  getOrCreateDeviceId: vi.fn(() => Promise.resolve("dev-1")),
  deleteKeyPair: vi.fn(() => Promise.resolve()),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts with loading true and user null", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.needsSetup).toBe(false)
  })

  it("login calls api and sets user", async () => {
    const userData = { id: "u1", username: "test", email: "test@test.com" }
    mockApi.mockResolvedValueOnce({ user: userData, accessToken: "at", refreshToken: "rt" })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login("test", "password")
    })

    expect(result.current.user).toEqual(userData)
    expect(result.current.loading).toBe(false)
    expect(mockWsConnect).toHaveBeenCalled()
    expect(mockApi).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ login: "test", password: "password" }),
      }),
    )
  })

  it("register calls api with username, email, password", async () => {
    const userData = { id: "u2", username: "newuser", email: "new@test.com" }
    mockApi.mockResolvedValueOnce({ user: userData, accessToken: "at", refreshToken: "rt" })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register("newuser", "new@test.com", "password")
    })

    expect(result.current.user).toEqual(userData)
    expect(mockApi).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "newuser", email: "new@test.com", password: "password" }),
      }),
    )
  })

  it("register sets needsSetup when flag is returned", async () => {
    const userData = { id: "u3", username: "user", email: "user@test.com" }
    mockApi.mockResolvedValueOnce({ user: userData, accessToken: "at", refreshToken: "rt", needsSetup: true })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register("user", "user@test.com", "pass")
    })

    expect(result.current.needsSetup).toBe(true)
  })

  it("completeSetup clears needsSetup", async () => {
    const userData = { id: "u4", username: "u", email: "u@u.com" }
    mockApi.mockResolvedValueOnce({ user: userData, accessToken: "at", refreshToken: "rt", needsSetup: true })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register("u", "u@u.com", "pass")
    })
    expect(result.current.needsSetup).toBe(true)

    act(() => result.current.completeSetup())
    expect(result.current.needsSetup).toBe(false)
  })

  it("logout clears user and disconnects ws", async () => {
    const userData = { id: "u1", username: "test", email: "test@test.com" }
    mockApi.mockResolvedValueOnce({ user: userData, accessToken: "at", refreshToken: "rt" })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login("test", "pass")
    })
    expect(result.current.user).toEqual(userData)

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(mockWsDisconnect).toHaveBeenCalled()
  })

  it("network failure keeps tokens and shows offline instead of login", async () => {
    vi.mocked(getTokens).mockResolvedValue({ accessToken: "at", refreshToken: "rt" })
    mockApi.mockRejectedValueOnce(new NetworkError())

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.user).toBeNull()
    expect(result.current.offline).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(clearTokens).not.toHaveBeenCalled()
    expect(mockWsConnect).not.toHaveBeenCalled()
  })

  it("network failure with cached user shows cached session", async () => {
    const userData = { id: "u1", username: "cached", email: "c@test.com" }
    await cacheSet(offlineKeys.user, userData)
    vi.mocked(getTokens).mockResolvedValue({ accessToken: "at", refreshToken: "rt" })
    mockApi.mockRejectedValueOnce(new NetworkError())

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.user).toEqual(userData)
    expect(result.current.offline).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(clearTokens).not.toHaveBeenCalled()
  })

  it("retry recovers when connectivity returns", async () => {
    const userData = { id: "u2", username: "back", email: "b@test.com" }
    vi.mocked(getTokens).mockResolvedValue({ accessToken: "at", refreshToken: "rt" })
    mockApi.mockRejectedValueOnce(new NetworkError())

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(result.current.offline).toBe(true)

    mockApi.mockResolvedValueOnce(userData)
    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.user).toEqual(userData)
    expect(result.current.offline).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it("throws when useAuth is used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider")
  })
})
