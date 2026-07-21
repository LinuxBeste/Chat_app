import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockLimit, mockSelect, mockReturning, mockInsert } = vi.hoisted(() => {
  const mLimit = vi.fn()
  const mWhere = vi.fn(() => ({ limit: mLimit }))
  const mFrom = vi.fn(() => ({ where: mWhere }))
  const mSelect = vi.fn(() => ({ from: mFrom }))
  const mReturning = vi.fn()
  const mValues = vi.fn(() => ({ returning: mReturning }))
  const mInsert = vi.fn(() => ({ values: mValues }))
  return {
    mockLimit: mLimit,
    mockSelect: mSelect,
    mockReturning: mReturning,
    mockInsert: mInsert,
  }
})

vi.mock("../lib/db.js", () => ({
  db: { select: mockSelect, insert: mockInsert },
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
import { handleSendMessage, handleTyping } from "./messages.js"

const mockWs = { send: vi.fn() } as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe("handleSendMessage", () => {
  it("rejects non-members", async () => {
    mockLimit.mockResolvedValueOnce([])

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
    mockLimit.mockResolvedValueOnce([{ userId: "user1" }])
    mockReturning.mockResolvedValueOnce([
      {
        id: "msg1",
        conversationId: "conv1",
        senderId: "user1",
        content: "hello",
        type: "text",
        createdAt: new Date("2024-01-01"),
      },
    ])
    mockLimit.mockResolvedValueOnce([{ username: "testuser", displayName: "Test", avatar: null }])

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
    mockLimit.mockResolvedValueOnce([{ userId: "user1" }])
    mockReturning.mockResolvedValueOnce([
      {
        id: "msg1",
        conversationId: "conv1",
        senderId: "user1",
        content: "hello",
        type: "text",
        createdAt: new Date("2024-01-01"),
      },
    ])
    mockLimit.mockResolvedValueOnce([{ username: "test", displayName: "Test", avatar: null }])

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
    mockLimit.mockResolvedValueOnce([{ userId: "user1" }])
    mockReturning.mockResolvedValueOnce([
      {
        id: "msg1",
        conversationId: "conv1",
        senderId: "user1",
        content: "hello",
        type: "text",
        createdAt: new Date("2024-01-01"),
      },
    ])
    mockLimit.mockResolvedValueOnce([{ username: "test", displayName: "Test", avatar: null }])

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
