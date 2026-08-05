import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCallOffer, handleCallAnswer, handleCallIceCandidate, handleCallEnd } from "./calls.js";

const mockRedisPublish = vi.fn();
vi.mock("../lib/redis.js", () => ({
  getRedis: vi.fn(),
}));

import { getRedis } from "../lib/redis.js";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockOfferPayload(overrides = {}) {
  return { targetUserId: "user2", conversationId: "conv1", sdp: { type: "offer", sdp: "sdp1" }, ...overrides };
}

describe("handleCallOffer", () => {
  it("returns offer event", async () => {
    vi.mocked(getRedis).mockReturnValue(null);

    const event = await handleCallOffer(mockOfferPayload(), "user1");

    expect(event.type).toBe("call:offer");
    expect(event.callerId).toBe("user1");
    expect(event.sdp).toEqual({ type: "offer", sdp: "sdp1" });
    expect(event.sessionId).toBeTruthy();
  });

  it("publishes to redis", async () => {
    const mockRedis = { publish: mockRedisPublish };
    vi.mocked(getRedis).mockReturnValue(mockRedis as any);

    const event = await handleCallOffer(mockOfferPayload(), "user1");

    expect(mockRedisPublish).toHaveBeenCalledWith("chat:user:user2", JSON.stringify(event));
  });
});

describe("handleCallAnswer", () => {
  it("returns answer event", async () => {
    vi.mocked(getRedis).mockReturnValue(null);
    const offer = await handleCallOffer(mockOfferPayload(), "user1");

    const event = await handleCallAnswer({ sessionId: offer.sessionId, sdp: { type: "answer", sdp: "sdp2" } }, "user2");

    expect(event).not.toBeNull();
    expect(event!.type).toBe("call:answer");
    expect(event!.sessionId).toBe(offer.sessionId);
  });
});

describe("handleCallIceCandidate", () => {
  it("returns ICE event", async () => {
    vi.mocked(getRedis).mockReturnValue(null);
    const offer = await handleCallOffer(mockOfferPayload(), "user1");

    const event = await handleCallIceCandidate(
      { sessionId: offer.sessionId, candidate: { candidate: "cand1" } },
      "user1",
    );

    expect(event).not.toBeNull();
    expect(event!.type).toBe("call:ice-candidate");
    expect(event!.sessionId).toBe(offer.sessionId);
  });
});

describe("handleCallEnd", () => {
  it("returns ended event", async () => {
    vi.mocked(getRedis).mockReturnValue(null);
    const offer = await handleCallOffer(mockOfferPayload(), "user1");

    const event = await handleCallEnd({ sessionId: offer.sessionId }, "user1");

    expect(event).not.toBeNull();
    expect(event!.type).toBe("call:ended");
    expect(event!.sessionId).toBe(offer.sessionId);
  });

  it("cleans up state", async () => {
    vi.mocked(getRedis).mockReturnValue(null);
    const offer = await handleCallOffer(mockOfferPayload(), "user1");

    await handleCallEnd({ sessionId: offer.sessionId }, "user1");

    const answer = await handleCallAnswer(
      { sessionId: offer.sessionId, sdp: { type: "answer", sdp: "sdp2" } },
      "user2",
    );
    expect(answer).toBeNull();
  });
});
