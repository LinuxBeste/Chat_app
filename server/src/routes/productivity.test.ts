import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import app from "../app.js"
import { verifyToken } from "../lib/jwt.js"

const { mockData } = vi.hoisted(() => ({ mockData: { current: [] as any[] } }))

vi.mock("../lib/db.js", () => {
  const chain: any = {
    then: (resolve: any) => Promise.resolve(mockData.current).then(resolve),
    catch: (reject: any) => Promise.resolve(mockData.current).catch(reject),
    finally: (handler: any) => Promise.resolve(mockData.current).finally(handler),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => Promise.resolve(undefined)),
  }
  return {
    db: {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      query: {
        conversations: { findFirst: vi.fn(() => Promise.resolve(undefined)) },
      },
    },
  }
})

vi.mock("../lib/jwt.js", () => ({ verifyToken: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: "00000000-0000-0000-0000-000000000001", username: "test" })
  mockData.current = []
})

describe("POST /api/productivity/pins", () => {
  const pinBody = {
    conversationId: "00000000-0000-0000-0000-00000000000c",
    messageId: "00000000-0000-0000-0000-00000000000d",
  }

  it("pins a message", async () => {
    const res = await request(app).post("/api/productivity/pins").set("Authorization", "Bearer token").send(pinBody)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message", "Message pinned")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/productivity/pins").send(pinBody)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/productivity/pins/:conversationId/:messageId", () => {
  it("unpins a message", async () => {
    const res = await request(app).delete("/api/productivity/pins/c1/m1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Message unpinned")
  })
})

describe("GET /api/productivity/pins/:conversationId", () => {
  it("lists pinned messages", async () => {
    mockData.current = [
      {
        id: "pin1",
        messageId: "m1",
        messageContent: "Hello",
        messageType: "text",
        senderUsername: "test",
        pinnedAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).get("/api/productivity/pins/c1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })
})

describe("GET /api/productivity/search", () => {
  it("searches messages with query", async () => {
    mockData.current = [
      {
        id: "m1",
        content: "hello world",
        type: "text",
        createdAt: new Date().toISOString(),
        senderUsername: "test",
        conversationId: "c1",
      },
    ]
    const res = await request(app)
      .get("/api/productivity/search")
      .query({ q: "hello" })
      .set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  it("returns empty array for no matches", async () => {
    const res = await request(app)
      .get("/api/productivity/search")
      .query({ q: "abc" })
      .set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it("returns 400 when query is empty", async () => {
    const res = await request(app).get("/api/productivity/search").query({ q: "" }).set("Authorization", "Bearer token")
    expect(res.status).toBe(400)
  })

  it("returns 400 when query is missing", async () => {
    const res = await request(app).get("/api/productivity/search").set("Authorization", "Bearer token")
    expect(res.status).toBe(400)
  })
})
