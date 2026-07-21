import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockChain, mockSelect, mockInsert, mockUpdate, mockLimit } = vi.hoisted(() => {
  const mLimit = vi.fn(() => chain)
  const chain: any = {
    then: (resolve: any) => Promise.resolve(mockChain.current).then(resolve),
    catch: (reject: any) => Promise.resolve(mockChain.current).catch(reject),
    finally: (handler: any) => Promise.resolve(mockChain.current).finally(handler),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: mLimit,
    returning: vi.fn(() => chain),
    values: vi.fn(() => ({ returning: chain.returning })),
    set: vi.fn(() => chain),
  }
  return {
    mockChain: { current: [] as any[] },
    mockSelect: vi.fn(() => ({ from: chain.from })),
    mockInsert: vi.fn(() => ({ values: chain.values })),
    mockUpdate: vi.fn(() => ({ set: chain.set })),
    mockLimit: mLimit,
  }
})

vi.mock("../lib/db.js", () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}))

const { mockRedisPublish } = vi.hoisted(() => {
  const mPublish = vi.fn()
  return { mockRedisPublish: mPublish }
})

vi.mock("../lib/redis.js", () => ({
  getRedis: vi.fn(),
}))

const { mockSendToConversation } = vi.hoisted(() => {
  const mSendToConversation = vi.fn()
  return { mockSendToConversation: mSendToConversation }
})

vi.mock("./clients.js", () => ({
  sendToConversation: mockSendToConversation,
}))

import { getRedis } from "../lib/redis.js"
import { handleSendMessage, handleTyping, handleEditMessage, handleDeleteMessage } from "./messages.js"

const mockWs = { send: vi.fn() } as any

beforeEach(() => {
  vi.clearAllMocks()
  mockChain.current = []
})

describe("handleSendMessage", () => {
  it("rejects non-members", async () => {
    mockChain.current = []

    await handleSendMessage(
      mockWs,
      { type: "message:send", conversationId: "conv1", content: "hello" },
      "user1",
      "test",
    )

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", error: "Not a member of this conversation" }),
    )
  })

  it("sends message for members", async () => {
    mockChain.current = [
      { userId: "user1", id: "msg1", conversationId: "conv1", content: "hello", type: "text", createdAt: new Date("2024-01-01"), username: "testuser", displayName: "Test", avatar: null },
    ]

    await handleSendMessage(
      mockWs,
      { type: "message:send", conversationId: "conv1", content: "hello" },
      "user1",
      "test",
    )

    expect(mockWs.send).toHaveBeenCalled()
    const sent = JSON.parse(mockWs.send.mock.calls[0][0])
    expect(sent.type).toBe("message:new")
    expect(sent.content).toBe("hello")

    expect(mockSendToConversation).toHaveBeenCalledWith("conv1", expect.objectContaining({ type: "message:new" }), "user1")
  })

  it("publishes to redis when available", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)
    mockChain.current = [
      { userId: "user1", id: "msg1", conversationId: "conv1", content: "hello", type: "text", createdAt: new Date("2024-01-01"), username: "test", displayName: "Test", avatar: null },
    ]

    await handleSendMessage(
      mockWs,
      { type: "message:send", conversationId: "conv1", content: "hello" },
      "user1",
      "test",
    )

    expect(mockRedisPublish).toHaveBeenCalledWith("chat:conversation:conv1", expect.any(String))
    expect(mockSendToConversation).toHaveBeenCalledWith("conv1", expect.objectContaining({ type: "message:new" }), "user1")
  })

  it("works without redis", async () => {
    vi.mocked(getRedis).mockReturnValue(null)
    mockChain.current = [
      { userId: "user1", id: "msg1", conversationId: "conv1", content: "hello", type: "text", createdAt: new Date("2024-01-01"), username: "test", displayName: "Test", avatar: null },
    ]

    await handleSendMessage(
      mockWs,
      { type: "message:send", conversationId: "conv1", content: "hello" },
      "user1",
      "test",
    )

    expect(mockWs.send).toHaveBeenCalled()
    expect(mockRedisPublish).not.toHaveBeenCalled()
    expect(mockSendToConversation).toHaveBeenCalledWith("conv1", expect.objectContaining({ type: "message:new" }), "user1")
  })

  it("handles db errors gracefully", async () => {
    mockLimit.mockRejectedValueOnce(new Error("db down"))

    await handleSendMessage(
      mockWs,
      { type: "message:send", conversationId: "conv1", content: "hello" },
      "user1",
      "test",
    )

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Failed to send message" }))
  })
})

describe("handleTyping", () => {
  it("publishes to redis and delivers to conversation", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await handleTyping(mockWs, { type: "message:typing", conversationId: "conv1" }, "user1")

    expect(mockRedisPublish).toHaveBeenCalledWith(
      "chat:conversation:conv1",
      JSON.stringify({ type: "message:typing", conversationId: "conv1", userId: "user1" }),
    )
    expect(mockSendToConversation).toHaveBeenCalledWith(
      "conv1",
      { type: "message:typing", conversationId: "conv1", userId: "user1" },
      "user1",
    )
  })

  it("delivers locally without redis", async () => {
    vi.mocked(getRedis).mockReturnValue(null)

    await handleTyping(mockWs, { type: "message:typing", conversationId: "conv1" }, "user1")

    expect(mockRedisPublish).not.toHaveBeenCalled()
    expect(mockSendToConversation).toHaveBeenCalledWith(
      "conv1",
      { type: "message:typing", conversationId: "conv1", userId: "user1" },
      "user1",
    )
  })

  it("doesn't crash on redis error", async () => {
    const mockRedis = { publish: vi.fn().mockRejectedValue(new Error("publish failed")) }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await expect(
      handleTyping(mockWs, { type: "message:typing", conversationId: "conv1" }, "user1"),
    ).resolves.toBeUndefined()
    expect(mockSendToConversation).toHaveBeenCalled()
  })
})

describe("handleEditMessage", () => {
  it("edits own message", async () => {
    mockChain.current = [
      { id: "msg1", conversationId: "conv1", senderId: "user1", content: "updated", deletedAt: null, editedAt: new Date() },
    ]

    await handleEditMessage(mockWs, { type: "message:edit", messageId: "msg1", conversationId: "conv1", content: "updated" }, "user1")

    expect(mockWs.send).toHaveBeenCalled()
    const sent = JSON.parse(mockWs.send.mock.calls[0][0])
    expect(sent.type).toBe("message:edited")
    expect(sent.content).toBe("updated")
    expect(mockSendToConversation).toHaveBeenCalled()
  })

  it("rejects edit of other's message", async () => {
    mockChain.current = [{ id: "msg1", conversationId: "conv1", senderId: "other", deletedAt: null }]

    await handleEditMessage(mockWs, { type: "message:edit", messageId: "msg1", conversationId: "conv1", content: "updated" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Not your message" }))
  })

  it("rejects edit of deleted message", async () => {
    mockChain.current = [{ id: "msg1", conversationId: "conv1", senderId: "user1", deletedAt: new Date() }]

    await handleEditMessage(mockWs, { type: "message:edit", messageId: "msg1", conversationId: "conv1", content: "updated" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Cannot edit deleted message" }))
  })

  it("returns error for missing message", async () => {
    mockChain.current = []

    await handleEditMessage(mockWs, { type: "message:edit", messageId: "unknown", conversationId: "conv1", content: "updated" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Message not found" }))
  })

  it("handles db errors gracefully", async () => {
    mockLimit.mockRejectedValueOnce(new Error("db down"))

    await handleEditMessage(mockWs, { type: "message:edit", messageId: "msg1", conversationId: "conv1", content: "updated" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Failed to edit message" }))
  })
})

describe("handleDeleteMessage", () => {
  it("deletes own message", async () => {
    mockChain.current = [{ id: "msg1", conversationId: "conv1", senderId: "user1", deletedAt: null }]

    await handleDeleteMessage(mockWs, { type: "message:delete", messageId: "msg1", conversationId: "conv1" }, "user1")

    expect(mockWs.send).toHaveBeenCalled()
    const sent = JSON.parse(mockWs.send.mock.calls[0][0])
    expect(sent.type).toBe("message:deleted")
    expect(mockSendToConversation).toHaveBeenCalled()
  })

  it("rejects delete of other's message", async () => {
    mockChain.current = [{ id: "msg1", conversationId: "conv1", senderId: "other", deletedAt: null }]

    await handleDeleteMessage(mockWs, { type: "message:delete", messageId: "msg1", conversationId: "conv1" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Not your message" }))
  })

  it("rejects delete of already deleted message", async () => {
    mockChain.current = [{ id: "msg1", conversationId: "conv1", senderId: "user1", deletedAt: new Date() }]

    await handleDeleteMessage(mockWs, { type: "message:delete", messageId: "msg1", conversationId: "conv1" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Message already deleted" }))
  })

  it("returns error for missing message", async () => {
    mockChain.current = []

    await handleDeleteMessage(mockWs, { type: "message:delete", messageId: "unknown", conversationId: "conv1" }, "user1")

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "error", error: "Message not found" }))
  })
})
