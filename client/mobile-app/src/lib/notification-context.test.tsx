import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { NotificationProvider, useNotificationCount } from "./notification-context"
import type { ReactNode } from "react"

const mockApi = vi.fn()

vi.mock("./api", () => ({
  api: (...args: any[]) => mockApi(...args),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: "token-123" })),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(),
  BASE_URL: "http://localhost:3000",
}))

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    mockApi.mockReset()
  })

  it("fetches unread count on mount", async () => {
    mockApi.mockResolvedValue({ count: 5 })

    const { result } = renderHook(() => useNotificationCount(), { wrapper })

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/notifications/unread-count")
    })
    await vi.waitFor(() => {
      expect(result.current.unreadCount).toBe(5)
    })
  })

  it("defaults to 0 unread count", () => {
    mockApi.mockResolvedValue({ count: 0 })

    const { result } = renderHook(() => useNotificationCount(), { wrapper })

    expect(result.current.unreadCount).toBe(0)
  })

  it("polls for updates every 30 seconds", async () => {
    vi.useFakeTimers()
    mockApi.mockResolvedValue({ count: 3 })

    renderHook(() => useNotificationCount(), { wrapper })

    await vi.waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    expect(mockApi).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it("provides fallback defaults when no provider", () => {
    const { result } = renderHook(() => useNotificationCount())
    expect(result.current.unreadCount).toBe(0)
    expect(() => result.current.refresh()).not.toThrow()
  })
})
