import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import app from "../app.js"
import { verifyToken } from "../lib/jwt.js"

vi.mock("../lib/redis.js", () => ({ getRedis: vi.fn(() => null) }))

const { ADMIN_ID, OWNER_ID, mockData, queryQueue } = vi.hoisted(() => {
  const ADMIN_ID = "admin-1"
  const OWNER_ID = "owner-1"
  return {
    ADMIN_ID,
    OWNER_ID,
    mockData: { current: [] as any[] },
    queryQueue: [] as any[][],
  }
})

vi.mock("../config.js", () => ({
  config: {
    port: 0,
    host: "localhost",
    nodeEnv: "test",
    apiPrefix: "/api",
    cors: { origin: "*" },
    jwt: { secret: "test", accessTtl: "15m", refreshTtl: "7d" },
    bcrypt: { rounds: 1 },
    db: { url: "postgresql://test:test@localhost:5432/test", poolMax: 1 },
    redis: { url: "" },
    rateLimit: { windowMs: 60000, max: 1000, ipMax: 100, regMax: 100 },
    ws: { heartbeatInterval: 30000, maxConnectionsPerIp: 100 },
    uploads: { dir: "/tmp/test-uploads", maxFileSize: 10485760 },
    admin: {
      userIds: [ADMIN_ID],
      ownerUserId: OWNER_ID,
    },
  },
}))

vi.mock("../lib/db.js", () => {
  const chain: any = {
    then: (resolve: any) => {
      const data = queryQueue.length > 0 ? queryQueue.shift()! : mockData.current
      return Promise.resolve(data).then(resolve)
    },
    catch: (reject: any) => {
      const data = queryQueue.length > 0 ? queryQueue.shift()! : mockData.current
      return Promise.resolve(data).catch(reject)
    },
    finally: (handler: any) => {
      const data = queryQueue.length > 0 ? queryQueue.shift()! : mockData.current
      return Promise.resolve(data).finally(handler)
    },
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
  }
  return {
    db: {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    },
  }
})

vi.mock("../lib/jwt.js", () => ({ verifyToken: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: ADMIN_ID, username: "admin" })
  mockData.current = []
  queryQueue.length = 0
})

describe("GET /api/admin/stats", () => {
  it("returns stats with all counts", async () => {
    queryQueue.push([{ value: 10 }], [{ value: 5 }], [{ value: 100 }], [{ value: 2 }], [{ value: 1 }])
    queryQueue.push([{ value: 3 }], [{ value: 4 }], [{ value: 20 }])

    const res = await request(app).get("/api/admin/stats").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      users: 10, conversations: 5, messages: 100, reports: 2, bans: 1,
      registrationsToday: 3, onlineUsers: 4, messagesToday: 20,
    })
  })
})

describe("GET /api/admin/users", () => {
  it("returns paginated users", async () => {
    const userRow = { id: "u1", username: "alice", email: "alice@test.com", status: "online", role: "member", displayName: null, avatar: null, createdAt: "2024-01-01", suspendedUntil: null, suspensionReason: null }
    queryQueue.push([userRow], [{ value: 1 }])
    const res = await request(app).get("/api/admin/users").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body.total).toBeDefined()
  })
})

describe("GET /api/admin/users/:id", () => {
  it("returns user details", async () => {
    queryQueue.push([{ id: "u1", username: "alice", email: "a@b.com", displayName: null, avatar: null, bio: null, customStatus: null, status: "online", emailVerified: "true", createdAt: "2024-01-01" }])
    queryQueue.push([{ value: 5 }], [{ value: 2 }], [])

    const res = await request(app).get("/api/admin/users/u1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("username", "alice")
    expect(res.body).toHaveProperty("messageCount", 5)
    expect(res.body).toHaveProperty("conversationCount", 2)
  })

  it("returns 404 for nonexistent user", async () => {
    const res = await request(app).get("/api/admin/users/nonexistent").set("Authorization", "Bearer token")
    expect(res.status).toBe(404)
  })
})

describe("PUT /api/admin/users/:id/suspend", () => {
  it("suspends a user", async () => {
    const res = await request(app).put("/api/admin/users/u1/suspend").set("Authorization", "Bearer token").send({ suspended: true })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "User suspended")
  })

  it("unsuspends a user", async () => {
    const res = await request(app).put("/api/admin/users/u1/suspend").set("Authorization", "Bearer token").send({ suspended: false })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "User unsuspended")
  })
})

describe("DELETE /api/admin/users/:id", () => {
  it("deletes a user", async () => {
    const res = await request(app).delete("/api/admin/users/u1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "User deleted")
  })
})

describe("GET /api/admin/reports", () => {
  it("returns paginated reports", async () => {
    const reportRow = { id: "r1", reportedBy: "u1", targetUserId: "u2", reason: "spam", status: "open", createdAt: "2024-01-01" }
    queryQueue.push([reportRow], [{ value: 1 }], [{ id: "u1", username: "alice" }, { id: "u2", username: "bob" }])
    const res = await request(app).get("/api/admin/reports").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body.total).toBeDefined()
  })
})

describe("PUT /api/admin/reports/:id", () => {
  it("resolves a report", async () => {
    const res = await request(app).put("/api/admin/reports/r1").set("Authorization", "Bearer token").send({ status: "resolved" })
    expect(res.status).toBe(200)
  })

  it("returns 400 for invalid status", async () => {
    const res = await request(app).put("/api/admin/reports/r1").set("Authorization", "Bearer token").send({ status: "invalid" })
    expect(res.status).toBe(400)
  })
})

describe("GET /api/admin/bans", () => {
  it("returns paginated bans", async () => {
    const banRow = { id: "b1", userId: "u2", bannedBy: "u1", reason: "spam", expiresAt: null, createdAt: "2024-01-01" }
    queryQueue.push([banRow], [{ value: 1 }])
    const res = await request(app).get("/api/admin/bans").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body.total).toBeDefined()
  })
})

describe("DELETE /api/admin/bans/:id", () => {
  it("removes a ban", async () => {
    const res = await request(app).delete("/api/admin/bans/b1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Ban removed")
  })
})

describe("GET /api/admin/activity", () => {
  it("returns activity feed", async () => {
    mockData.current = []
    const res = await request(app).get("/api/admin/activity").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe("GET /api/admin/admins", () => {
  it("returns owner and admin IDs", async () => {
    const res = await request(app).get("/api/admin/admins").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("ownerId")
    expect(res.body).toHaveProperty("adminIds")
  })
})

describe("auth guards", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/stats")
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin user", async () => {
    vi.mocked(verifyToken).mockReturnValue({ userId: "non-admin", username: "test" })
    const res = await request(app).get("/api/admin/stats").set("Authorization", "Bearer token")
    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty("error", "Admin access required")
  })
})
