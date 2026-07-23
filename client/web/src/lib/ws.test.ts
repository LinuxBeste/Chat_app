import { describe, it, expect, vi, beforeEach } from "vitest"
import { wsClient } from "./ws"

vi.mock("./api", () => ({
  getTokens: vi.fn(() => ({ accessToken: "mock-token" })),
  refreshAccess: vi.fn(),
}))

class MockWebSocket {
  readyState = WebSocket.OPEN
  send = vi.fn()
  close = vi.fn()
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null

  constructor(_url: string) {
    setTimeout(() => {
      this.onopen?.()
      setTimeout(() => {
        this.onmessage?.({ data: JSON.stringify({ type: "connected", userId: "u1" }) })
      }, 0)
    }, 0)
  }
}

describe("WSClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("WebSocket", MockWebSocket)
    wsClient.disconnect()
  })

  it("connects and becomes connected", async () => {
    wsClient.connect()
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true)
    })
  })

  it("send is a no-op when not connected", () => {
    expect(() => wsClient.send("test")).not.toThrow()
  })

  it("disconnects and clears state", async () => {
    wsClient.connect()
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true)
    })
    wsClient.disconnect()
    expect(wsClient.isConnected()).toBe(false)
  })
})
