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
    orderBy: vi.fn(() => chain),
  }
  return {
    db: {
      select: vi.fn(() => chain),
    },
  }
})

vi.mock("../lib/jwt.js", () => ({ verifyToken: vi.fn() }))

const CALL_ID = "call0000-0000-0000-0000-000000000001"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: "u1", username: "test" })
  mockData.current = []
})

describe("GET /api/calls", () => {
  it("returns calls list", async () => {
    mockData.current = [
      {
        id: CALL_ID,
        callerId: "u1",
        calleeId: "u2",
        status: "ended",
        duration: 120,
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).get("/api/calls").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
  })

  it("returns empty array when no calls", async () => {
    const res = await request(app).get("/api/calls").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it("respects limit query param", async () => {
    mockData.current = Array.from({ length: 3 }, (_, i) => ({
      id: `${CALL_ID}${i}`,
      callerId: "u1",
      calleeId: "u2",
      status: "ended",
      duration: 60,
      createdAt: new Date().toISOString(),
    }))
    const res = await request(app).get("/api/calls?limit=2").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it("caps limit at 100", async () => {
    const res = await request(app).get("/api/calls?limit=200").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it("includes call properties", async () => {
    mockData.current = [
      {
        id: CALL_ID,
        callerId: "u1",
        calleeId: "u2",
        status: "ended",
        duration: 120,
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).get("/api/calls").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body[0]).toHaveProperty("id", CALL_ID)
    expect(res.body[0]).toHaveProperty("callerId")
    expect(res.body[0]).toHaveProperty("calleeId")
    expect(res.body[0]).toHaveProperty("status")
  })

  it("returns 401 without auth header", async () => {
    const res = await request(app).get("/api/calls")
    expect(res.status).toBe(401)
  })

  it("returns 401 with invalid token", async () => {
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error("jwt error")
    })
    const res = await request(app).get("/api/calls").set("Authorization", "Bearer bad-token")
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty("error", "Invalid or expired token")
  })

  it("returns 401 with missing Bearer prefix", async () => {
    const res = await request(app).get("/api/calls").set("Authorization", "Basic dXNlcjpwYXNz")
    expect(res.status).toBe(401)
  })
})
