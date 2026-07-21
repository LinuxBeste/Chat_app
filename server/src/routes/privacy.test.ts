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
const BLOCKED_ID = "00000000-0000-0000-0000-000000000002"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: USER_ID, username: "test" })
  mockData.current = []
})

describe("POST /api/privacy/blocks", () => {
  it("blocks a user", async () => {
    const res = await request(app)
      .post("/api/privacy/blocks")
      .set("Authorization", "Bearer token")
      .send({ userId: BLOCKED_ID })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message", "User blocked")
  })

  it("returns 400 when blocking self", async () => {
    const res = await request(app)
      .post("/api/privacy/blocks")
      .set("Authorization", "Bearer token")
      .send({ userId: USER_ID })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("error", "Cannot block yourself")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/privacy/blocks").send({ userId: BLOCKED_ID })
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/privacy/blocks/:userId", () => {
  it("unblocks a user", async () => {
    const res = await request(app).delete(`/api/privacy/blocks/${BLOCKED_ID}`).set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "User unblocked")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).delete(`/api/privacy/blocks/${BLOCKED_ID}`)
    expect(res.status).toBe(401)
  })
})

describe("GET /api/privacy/blocks", () => {
  it("lists blocked users", async () => {
    mockData.current = [{ blockedUserId: BLOCKED_ID, createdAt: new Date().toISOString() }]
    const res = await request(app).get("/api/privacy/blocks").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/privacy/blocks")
    expect(res.status).toBe(401)
  })
})

describe("POST /api/privacy/messages/:id/read", () => {
  it("records a read receipt", async () => {
    const res = await request(app).post("/api/privacy/messages/m1/read").set("Authorization", "Bearer token")
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message", "Read receipt recorded")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/privacy/messages/m1/read")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/privacy/messages/:id/reads", () => {
  it("returns read receipts", async () => {
    mockData.current = [{ userId: BLOCKED_ID, readAt: new Date().toISOString() }]
    const res = await request(app).get("/api/privacy/messages/m1/reads").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
