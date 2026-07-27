import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  handleVoiceJoin,
  handleVoiceLeave,
  handleVoiceOffer,
  handleVoiceAnswer,
  handleVoiceIceCandidate,
} from "./voice.js"

const mockRedisPublish = vi.fn()
vi.mock("../lib/redis.js", () => ({
  getRedis: vi.fn(),
}))

vi.mock("../lib/logger.js", () => ({
  createContextLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}))

import { getRedis } from "../lib/redis.js"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("handleVoiceJoin", () => {
  it("returns joined event with participant list", async () => {
    vi.mocked(getRedis).mockReturnValue(null)

    const event = await handleVoiceJoin({ channelId: "ch1" }, "user1")

    expect(event.type).toBe("voice:joined")
    expect(event.channelId).toBe("ch1")
    expect(event.participants).toContain("user1")
  })

  it("includes existing participants", async () => {
    vi.mocked(getRedis).mockReturnValue(null)

    await handleVoiceJoin({ channelId: "ch2" }, "user1")
    const event = await handleVoiceJoin({ channelId: "ch2" }, "user2")

    expect(event.participants).toContain("user1")
    expect(event.participants).toContain("user2")
  })

  it("publishes voice:user-joined to existing participants", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await handleVoiceJoin({ channelId: "ch3" }, "user1")
    mockRedisPublish.mockClear()
    await handleVoiceJoin({ channelId: "ch3" }, "user2")

    expect(mockRedisPublish).toHaveBeenCalledTimes(1)
    expect(mockRedisPublish).toHaveBeenCalledWith("chat:user:user1", expect.stringContaining("voice:user-joined"))
  })

  it("does not publish if no redis", async () => {
    vi.mocked(getRedis).mockReturnValue(null)

    await handleVoiceJoin({ channelId: "ch4" }, "user1")
    await handleVoiceJoin({ channelId: "ch4" }, "user2")

    expect(mockRedisPublish).not.toHaveBeenCalled()
  })
})

describe("handleVoiceLeave", () => {
  it("returns left event", async () => {
    vi.mocked(getRedis).mockReturnValue(null)
    await handleVoiceJoin({ channelId: "ch5" }, "user1")

    const event = await handleVoiceLeave({ channelId: "ch5" }, "user1")

    expect(event.type).toBe("voice:left")
    expect(event.channelId).toBe("ch5")
  })

  it("notifies remaining participants", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await handleVoiceJoin({ channelId: "ch6" }, "user1")
    await handleVoiceJoin({ channelId: "ch6" }, "user2")
    mockRedisPublish.mockClear()

    await handleVoiceLeave({ channelId: "ch6" }, "user1")

    expect(mockRedisPublish).toHaveBeenCalledWith("chat:user:user2", expect.stringContaining("voice:user-left"))
  })

  it("cleans up empty rooms", async () => {
    vi.mocked(getRedis).mockReturnValue(null)
    await handleVoiceJoin({ channelId: "ch7" }, "user1")

    await handleVoiceLeave({ channelId: "ch7" }, "user1")

    const event = await handleVoiceJoin({ channelId: "ch7" }, "user1")
    expect(event.participants).toEqual(["user1"])
  })
})

describe("handleVoiceOffer", () => {
  it("publishes offer to target user", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await handleVoiceOffer({ channelId: "ch1", targetUserId: "user2", sdp: { type: "offer", sdp: "sdp1" } }, "user1")

    expect(mockRedisPublish).toHaveBeenCalledWith("chat:user:user2", expect.stringContaining("voice:offer"))
  })

  it("returns null", async () => {
    vi.mocked(getRedis).mockReturnValue(null)
    const result = await handleVoiceOffer(
      { channelId: "ch1", targetUserId: "user2", sdp: { type: "offer", sdp: "sdp1" } },
      "user1",
    )
    expect(result).toBeNull()
  })
})

describe("handleVoiceAnswer", () => {
  it("publishes answer to target user", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await handleVoiceAnswer({ channelId: "ch1", targetUserId: "user1", sdp: { type: "answer", sdp: "sdp2" } }, "user2")

    expect(mockRedisPublish).toHaveBeenCalledWith("chat:user:user1", expect.stringContaining("voice:answer"))
  })

  it("returns null", async () => {
    vi.mocked(getRedis).mockReturnValue(null)
    const result = await handleVoiceAnswer(
      { channelId: "ch1", targetUserId: "user1", sdp: { type: "answer", sdp: "sdp2" } },
      "user2",
    )
    expect(result).toBeNull()
  })
})

describe("handleVoiceIceCandidate", () => {
  it("publishes ICE candidate to target user", async () => {
    const mockRedis = { publish: mockRedisPublish }
    vi.mocked(getRedis).mockReturnValue(mockRedis as any)

    await handleVoiceIceCandidate(
      { channelId: "ch1", targetUserId: "user1", candidate: { candidate: "cand1" } },
      "user2",
    )

    expect(mockRedisPublish).toHaveBeenCalledWith("chat:user:user1", expect.stringContaining("voice:ice-candidate"))
  })

  it("returns null", async () => {
    vi.mocked(getRedis).mockReturnValue(null)
    const result = await handleVoiceIceCandidate(
      { channelId: "ch1", targetUserId: "user1", candidate: { candidate: "cand1" } },
      "user2",
    )
    expect(result).toBeNull()
  })
})
