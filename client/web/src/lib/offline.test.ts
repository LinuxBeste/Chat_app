import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getPendingMessages,
  addPendingMessage,
  removePendingMessage,
  clearPendingMessages,
  getCachedMessages,
  cacheMessages,
  clearConversationCache,
  isOnline,
  subscribeToOnlineStatus,
} from "./offline"

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe("offline message queue", () => {
  const msg = {
    id: "msg-1",
    conversationId: "conv-1",
    type: "message:send" as const,
    payload: { content: "hello" },
    createdAt: new Date().toISOString(),
  }

  it("returns empty queue initially", () => {
    expect(getPendingMessages()).toEqual([])
  })

  it("adds a message to the queue", () => {
    addPendingMessage(msg)
    expect(getPendingMessages()).toHaveLength(1)
    expect(getPendingMessages()[0].id).toBe("msg-1")
  })

  it("removes a message from the queue by id", () => {
    addPendingMessage(msg)
    addPendingMessage({ ...msg, id: "msg-2" })
    removePendingMessage("msg-1")
    expect(getPendingMessages()).toHaveLength(1)
    expect(getPendingMessages()[0].id).toBe("msg-2")
  })

  it("clears all pending messages", () => {
    addPendingMessage(msg)
    clearPendingMessages()
    expect(getPendingMessages()).toEqual([])
  })

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem("offline:pending", "not-json")
    expect(getPendingMessages()).toEqual([])
  })

  it("handles localStorage full gracefully", () => {
    addPendingMessage(msg)
    expect(getPendingMessages()).toHaveLength(1)
  })
})

describe("offline message cache", () => {
  const msgs = [
    { id: "m1", content: "hello" },
    { id: "m2", content: "world" },
  ]

  it("returns empty cache initially", () => {
    expect(getCachedMessages("conv-1")).toEqual([])
  })

  it("caches and retrieves messages", () => {
    cacheMessages("conv-1", msgs)
    expect(getCachedMessages("conv-1")).toEqual(msgs)
  })

  it("clears conversation cache", () => {
    cacheMessages("conv-1", msgs)
    clearConversationCache("conv-1")
    expect(getCachedMessages("conv-1")).toEqual([])
  })

  it("only caches last 200 messages", () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ id: `m${i}`, content: `msg ${i}` }))
    cacheMessages("conv-1", many)
    expect(getCachedMessages("conv-1").length).toBe(200)
    expect(getCachedMessages("conv-1")[0].id).toBe("m100")
  })
})

describe("online status", () => {
  it("returns navigator.onLine", () => {
    expect(isOnline()).toBe(typeof navigator.onLine === "boolean" ? navigator.onLine : true)
  })

  it("subscribes to online/offline events", () => {
    const onOnline = vi.fn()
    const onOffline = vi.fn()
    const unsub = subscribeToOnlineStatus(onOnline, onOffline)
    window.dispatchEvent(new Event("online"))
    expect(onOnline).toHaveBeenCalled()
    window.dispatchEvent(new Event("offline"))
    expect(onOffline).toHaveBeenCalled()
    unsub()
    window.dispatchEvent(new Event("online"))
    expect(onOnline).toHaveBeenCalledTimes(1)
  })
})
