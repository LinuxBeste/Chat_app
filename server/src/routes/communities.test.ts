import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import app from "../app.js"
import { verifyToken } from "../lib/jwt.js"

const { mockData, queryQueue } = vi.hoisted(() => ({
  mockData: { current: [] as any[] },
  queryQueue: [] as any[][],
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
      query: {
        conversations: { findFirst: vi.fn(() => Promise.resolve(undefined)) },
      },
    },
  }
})

vi.mock("../lib/jwt.js", () => ({ verifyToken: vi.fn() }))

const COM_ID = "c0000000-0000-0000-0000-000000000001"
const CHANNEL_ID = "ch000000-0000-0000-0000-000000000001"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: "u1", username: "test" })
  mockData.current = []
  queryQueue.length = 0
})

describe("POST /api/communities", () => {
  const validBody = { name: "Test Community", description: "A test community" }

  it("creates a community", async () => {
    mockData.current = [
      {
        id: COM_ID,
        name: "Test Community",
        description: "A test community",
        ownerId: "u1",
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).post("/api/communities").set("Authorization", "Bearer token").send(validBody)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("id", COM_ID)
    expect(res.body).toHaveProperty("name", "Test Community")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/communities").send(validBody)
    expect(res.status).toBe(401)
  })
})

describe("GET /api/communities", () => {
  it("lists communities", async () => {
    mockData.current = [{ id: COM_ID, name: "Test Community", ownerId: "u1", createdAt: new Date().toISOString() }]
    const res = await request(app).get("/api/communities").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/communities")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/communities/:id", () => {
  it("returns community with members and channels", async () => {
    mockData.current = [{ id: COM_ID, name: "Test Community", ownerId: "u1", createdAt: new Date().toISOString() }]
    const res = await request(app).get(`/api/communities/${COM_ID}`).set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("id", COM_ID)
    expect(res.body).toHaveProperty("members")
    expect(res.body).toHaveProperty("channels")
    expect(res.body).toHaveProperty("voiceChannels")
  })

  it("returns 404 when not found", async () => {
    const res = await request(app).get("/api/communities/nonexistent").set("Authorization", "Bearer token")
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty("error", "Community not found")
  })
})

describe("PUT /api/communities/:id", () => {
  it("updates a community", async () => {
    mockData.current = [
      {
        id: COM_ID,
        name: "Updated Name",
        description: "Updated desc",
        ownerId: "u1",
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app)
      .put(`/api/communities/${COM_ID}`)
      .set("Authorization", "Bearer token")
      .send({ name: "Updated Name", description: "Updated desc" })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("name", "Updated Name")
  })
})

describe("POST /api/communities/:id/channels", () => {
  it("creates a channel", async () => {
    queryQueue.push([{ role: "owner" }])
    mockData.current = [
      {
        id: CHANNEL_ID,
        communityId: COM_ID,
        name: "general",
        topic: "General chat",
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app)
      .post(`/api/communities/${COM_ID}/channels`)
      .set("Authorization", "Bearer token")
      .send({ name: "general", topic: "General chat" })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("id", CHANNEL_ID)
    expect(res.body).toHaveProperty("name", "general")
  })
})

describe("DELETE /api/communities/channels/:channelId", () => {
  it("deletes a channel", async () => {
    const res = await request(app)
      .delete(`/api/communities/channels/${CHANNEL_ID}`)
      .set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Channel deleted")
  })
})

const VOICE_ID = "vc000000-0000-0000-0000-000000000001"

describe("POST /api/communities/:id/voice", () => {
  it("creates a voice channel", async () => {
    queryQueue.push([{ role: "owner" }])
    mockData.current = [
      { id: VOICE_ID, communityId: COM_ID, name: "General Voice", createdAt: new Date().toISOString() },
    ]
    const res = await request(app)
      .post(`/api/communities/${COM_ID}/voice`)
      .set("Authorization", "Bearer token")
      .send({ name: "General Voice" })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("id", VOICE_ID)
    expect(res.body).toHaveProperty("name", "General Voice")
  })

  it("returns 403 without owner/admin role", async () => {
    queryQueue.push([{ role: "member" }])
    const res = await request(app)
      .post(`/api/communities/${COM_ID}/voice`)
      .set("Authorization", "Bearer token")
      .send({ name: "General Voice" })
    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/communities/voice/:voiceId", () => {
  it("deletes a voice channel", async () => {
    const res = await request(app).delete(`/api/communities/voice/${VOICE_ID}`).set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Voice channel deleted")
  })
})

describe("POST /api/communities/:id/invites", () => {
  it("creates an invite", async () => {
    queryQueue.push([{ role: "owner" }])
    mockData.current = [
      {
        id: "inv1",
        communityId: COM_ID,
        code: "abc123",
        createdBy: "u1",
        useCount: 0,
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).post(`/api/communities/${COM_ID}/invites`).set("Authorization", "Bearer token")
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("code")
  })
})

describe("POST /api/communities/join/:code", () => {
  it("joins with valid invite code", async () => {
    queryQueue.push([
      {
        id: "inv1",
        communityId: COM_ID,
        code: "valid123",
        createdBy: "u2",
        maxUses: null,
        useCount: 0,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    ])
    queryQueue.push([])
    const res = await request(app).post("/api/communities/join/valid123").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Joined community")
  })

  it("returns 410 when invite expired", async () => {
    mockData.current = [
      {
        id: "inv1",
        communityId: COM_ID,
        code: "expired",
        createdBy: "u2",
        maxUses: null,
        useCount: 0,
        expiresAt: new Date("2020-01-01"),
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).post("/api/communities/join/expired").set("Authorization", "Bearer token")
    expect(res.status).toBe(410)
    expect(res.body).toHaveProperty("error", "Invite expired")
  })

  it("returns 410 when max uses reached", async () => {
    mockData.current = [
      {
        id: "inv1",
        communityId: COM_ID,
        code: "maxed",
        createdBy: "u2",
        maxUses: 5,
        useCount: 5,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).post("/api/communities/join/maxed").set("Authorization", "Bearer token")
    expect(res.status).toBe(410)
    expect(res.body).toHaveProperty("error", "Invite max uses reached")
  })

  it("returns 409 when already a member", async () => {
    mockData.current = [
      {
        id: "inv1",
        communityId: COM_ID,
        code: "member",
        createdBy: "u2",
        maxUses: null,
        useCount: 0,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).post("/api/communities/join/member").set("Authorization", "Bearer token")
    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty("error", "Already a member")
  })

  it("returns 404 for invalid invite code", async () => {
    const res = await request(app).post("/api/communities/join/invalid").set("Authorization", "Bearer token")
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty("error", "Invalid invite code")
  })
})
