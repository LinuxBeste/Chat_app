import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { NotificationProvider, useNotificationCount } from "./notification-context"

vi.mock("./api", () => ({
  api: vi.fn(),
}))

import { api } from "./api"

function TestComponent() {
  const { unreadCount, refresh } = useNotificationCount()
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <button data-testid="refresh" onClick={refresh}>Refresh</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <NotificationProvider>
      <TestComponent />
    </NotificationProvider>,
  )
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches unread count on mount", async () => {
    vi.mocked(api).mockResolvedValueOnce({ count: 5 })

    renderWithProvider()

    await vi.waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("5")
    })
  })

  it("handles fetch failure gracefully", async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error("Network error"))

    renderWithProvider()

    await vi.waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0")
    })
  })

  it("refreshes count on demand", async () => {
    vi.mocked(api).mockResolvedValueOnce({ count: 3 })

    renderWithProvider()

    await vi.waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("3")
    })

    vi.mocked(api).mockResolvedValueOnce({ count: 7 })
    await act(async () => {
      screen.getByTestId("refresh").click()
    })

    await vi.waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("7")
    })
  })
})
