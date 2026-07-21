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

const USER_ID = "00000000-0000-0000-0000-000000000001"
const TARGET_ID = "00000000-0000-0000-0000-00000000000b"
const CONV_ID = "00000000-0000-0000-0000-00000000000c"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: USER_ID, username: "test" })
  mockData.current = []
})

describe("POST /api/moderation/reports", () => {
  const validBody = { targetUserId: TARGET_ID, reason: "spam" }

  it("creates a report", async () => {
    const res = await request(app).post("/api/moderation/reports").set("Authorization", "Bearer token").send(validBody)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message", "Report submitted")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/moderation/reports").send(validBody)
    expect(res.status).toBe(401)
  })
})

describe("POST /api/moderation/bans", () => {
  const banBody = { conversationId: CONV_ID, userId: TARGET_ID, reason: "spam" }

  it("returns 400 without conversationId (adminGuard check)", async () => {
    const res = await request(app)
      .post("/api/moderation/bans")
      .set("Authorization", "Bearer token")
      .send({ userId: TARGET_ID, reason: "spam" })
    expect(res.status).toBe(400)
  })

  it("returns 403 without admin role", async () => {
    mockData.current = [{ role: "member" }]
    const res = await request(app).post("/api/moderation/bans").set("Authorization", "Bearer token").send(banBody)
    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty("error", "Admin access required")
  })

  it("creates a ban with admin role", async () => {
    mockData.current = [{ role: "admin" }]
    const res = await request(app).post("/api/moderation/bans").set("Authorization", "Bearer token").send(banBody)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message", "User banned")
  })
})

describe("DELETE /api/moderation/bans/:conversationId/:userId", () => {
  it("unbans a user", async () => {
    mockData.current = [{ role: "admin" }]
    const res = await request(app)
      .delete(`/api/moderation/bans/${CONV_ID}/${TARGET_ID}`)
      .set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "User unbanned")
  })
})

describe("POST /api/moderation/mutes", () => {
  it("mutes a conversation", async () => {
    const res = await request(app)
      .post("/api/moderation/mutes")
      .set("Authorization", "Bearer token")
      .send({ conversationId: CONV_ID })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message", "Conversation muted")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/moderation/mutes").send({ conversationId: CONV_ID })
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/moderation/mutes/:conversationId", () => {
  it("unmutes a conversation", async () => {
    const res = await request(app).delete(`/api/moderation/mutes/${CONV_ID}`).set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Conversation unmuted")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).delete(`/api/moderation/mutes/${CONV_ID}`)
    expect(res.status).toBe(401)
  })
})
