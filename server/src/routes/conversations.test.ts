import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import app from "../app.js"
import { verifyToken } from "../lib/jwt.js"
import { db } from "../lib/db.js"

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
  queryQueue.length = 0
})

describe("POST /api/conversations", () => {
  const dmBody = { type: "dm", participantIds: ["00000000-0000-0000-0000-000000000002"] }
  const groupBody = {
    type: "group",
    name: "Group",
    participantIds: ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"],
  }

  it("creates a DM", async () => {
    mockData.current = [{ id: "new-dm", type: "dm" }]
    const res = await request(app).post("/api/conversations").set("Authorization", "Bearer token").send(dmBody)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("id")
  })

  it("creates a group", async () => {
    mockData.current = [{ id: "new-group", type: "group", name: "Group" }]
    const res = await request(app).post("/api/conversations").set("Authorization", "Bearer token").send(groupBody)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("id")
    expect(res.body).toHaveProperty("type", "group")
  })

  it("reuses existing DM", async () => {
    queryQueue.push([{ id: "existing-dm" }])
    queryQueue.push([{ userId: "00000000-0000-0000-0000-000000000001" }, { userId: "00000000-0000-0000-0000-000000000002" }])
    mockData.current = [{ id: "existing-dm", type: "dm", name: null, createdAt: new Date().toISOString() }]
    const res = await request(app).post("/api/conversations").set("Authorization", "Bearer token").send(dmBody)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("id", "existing-dm")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/conversations").send(dmBody)
    expect(res.status).toBe(401)
  })

  it("returns 400 with empty participantIds", async () => {
    const res = await request(app)
      .post("/api/conversations")
      .set("Authorization", "Bearer token")
      .send({ type: "dm", participantIds: [] })
    expect(res.status).toBe(400)
  })
})

describe("GET /api/conversations", () => {
  it("lists conversations", async () => {
    mockData.current = [{ id: "c1", type: "dm", createdAt: new Date().toISOString() }]
    const res = await request(app).get("/api/conversations").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/conversations")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/conversations/:id", () => {
  it("returns conversation with members", async () => {
    mockData.current = [{ id: "c1", type: "dm", name: null, createdAt: new Date().toISOString() }]
    const res = await request(app).get("/api/conversations/c1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("id", "c1")
    expect(res.body).toHaveProperty("type", "dm")
  })

  it("returns 404 for unknown conversation", async () => {
    const res = await request(app).get("/api/conversations/unknown").set("Authorization", "Bearer token")
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty("error", "Conversation not found")
  })

  it("includes members array", async () => {
    mockData.current = [{ id: "c1", type: "dm" }]
    const res = await request(app).get("/api/conversations/c1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("members")
    expect(Array.isArray(res.body.members)).toBe(true)
  })
})

describe("PUT /api/conversations/:id", () => {
  it("renames group", async () => {
    mockData.current = [{ id: "c1", type: "group", name: "New Name" }]
    const res = await request(app)
      .put("/api/conversations/c1")
      .set("Authorization", "Bearer token")
      .send({ name: "New Name" })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("name", "New Name")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).put("/api/conversations/c1").send({ name: "New Name" })
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/conversations/:id", () => {
  it("returns 404 (route not found)", async () => {
    const res = await request(app).delete("/api/conversations/c1").set("Authorization", "Bearer token")
    expect(res.status).toBe(404)
  })
})

describe("PUT /api/conversations/:id/messages/:msgId", () => {
  it("edits own message", async () => {
    mockData.current = [
      {
        id: "m1",
        conversationId: "c1",
        senderId: "00000000-0000-0000-0000-000000000001",
        content: "updated",
        deletedAt: null,
        editedAt: new Date().toISOString(),
      },
    ]
    const res = await request(app)
      .put("/api/conversations/c1/messages/m1")
      .set("Authorization", "Bearer token")
      .send({ content: "updated" })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("content", "updated")
  })

  it("returns 404 for unknown message", async () => {
    mockData.current = []
    const res = await request(app)
      .put("/api/conversations/c1/messages/unknown")
      .set("Authorization", "Bearer token")
      .send({ content: "updated" })
    expect(res.status).toBe(404)
  })

  it("returns 403 for other's message", async () => {
    mockData.current = [{ id: "m1", conversationId: "c1", senderId: "other-user", content: "old", deletedAt: null }]
    const res = await request(app)
      .put("/api/conversations/c1/messages/m1")
      .set("Authorization", "Bearer token")
      .send({ content: "updated" })
    expect(res.status).toBe(403)
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).put("/api/conversations/c1/messages/m1").send({ content: "updated" })
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/conversations/:id/messages/:msgId", () => {
  it("deletes own message", async () => {
    mockData.current = [
      { id: "m1", conversationId: "c1", senderId: "00000000-0000-0000-0000-000000000001", deletedAt: null },
    ]
    const res = await request(app).delete("/api/conversations/c1/messages/m1").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "Message deleted")
  })

  it("returns 404 for unknown message", async () => {
    mockData.current = []
    const res = await request(app).delete("/api/conversations/c1/messages/unknown").set("Authorization", "Bearer token")
    expect(res.status).toBe(404)
  })

  it("returns 403 for other's message", async () => {
    mockData.current = [{ id: "m1", conversationId: "c1", senderId: "other-user", deletedAt: null }]
    const res = await request(app).delete("/api/conversations/c1/messages/m1").set("Authorization", "Bearer token")
    expect(res.status).toBe(403)
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/conversations/c1/messages/m1")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/conversations/:id/messages", () => {
  it("returns messages", async () => {
    mockData.current = [
      {
        id: "m1",
        content: "hello",
        type: "text",
        senderId: "00000000-0000-0000-0000-000000000001",
        createdAt: new Date().toISOString(),
        editedAt: null,
        sender: { username: "test", displayName: null, avatar: null },
      },
    ]
    const res = await request(app).get("/api/conversations/c1/messages").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe("POST /api/conversations/:id/messages", () => {
  it("returns 404 (route not found)", async () => {
    const res = await request(app)
      .post("/api/conversations/c1/messages")
      .set("Authorization", "Bearer token")
      .send({ content: "hello" })
    expect(res.status).toBe(404)
  })
})
