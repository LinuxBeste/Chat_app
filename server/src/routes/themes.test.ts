import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import app from "../app.js"

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
    returning: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => Promise.resolve(undefined)),
  }
  const selectFn = vi.fn(() => chain)
  return {
    db: {
      select: selectFn,
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      sql: { count: "count" },
    },
  }
})

vi.mock("../lib/jwt.js", () => ({
  verifyToken: vi.fn(() => ({ userId: "user-1", username: "test" })),
}))

beforeEach(() => {
  mockData.current = []
})

function authHeader(token = "valid-token") {
  return { Authorization: `Bearer ${token}` }
}

describe("GET /api/themes", () => {
  it("returns an empty list when no themes exist", async () => {
    const res = await request(app).get("/api/themes").set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it("returns the list of themes", async () => {
    mockData.current = [{ id: "t1", userId: "user-1", name: "Dark", theme: "{}", isActive: "true" }]
    const res = await request(app).get("/api/themes").set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe("Dark")
  })
})

describe("GET /api/themes/active", () => {
  it("returns null when no active theme", async () => {
    const res = await request(app).get("/api/themes/active").set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it("returns the active theme", async () => {
    mockData.current = [{ id: "t1", userId: "user-1", name: "Ocean", theme: "{}", isActive: "true" }]
    const res = await request(app).get("/api/themes/active").set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.name).toBe("Ocean")
  })
})

describe("POST /api/themes", () => {
  it("creates a new theme", async () => {
    mockData.current = [
      {
        id: "t1",
        userId: "user-1",
        name: "Forest",
        theme: JSON.stringify({ colors: { accent: "#228B22" } }),
        isActive: "true",
      },
    ]
    const res = await request(app)
      .post("/api/themes")
      .set(authHeader())
      .send({ name: "Forest", theme: { colors: { accent: "#228B22" } } })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe("Forest")
  })

  it("rejects invalid theme data", async () => {
    const res = await request(app).post("/api/themes").set(authHeader()).send({ name: "", theme: {} })
    expect(res.status).toBe(400)
  })
})

describe("PUT /api/themes/:id", () => {
  it("updates an existing theme", async () => {
    mockData.current = [{ id: "t1", userId: "user-1", name: "Updated", theme: "{}", isActive: "false" }]
    const res = await request(app)
      .put("/api/themes/t1")
      .set(authHeader())
      .send({ name: "Updated", theme: { colors: { accent: "#FF0000" } } })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe("Updated")
  })

  it("returns 404 for non-existent theme", async () => {
    const res = await request(app).put("/api/themes/nonexistent").set(authHeader()).send({ name: "X", theme: {} })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/themes/:id", () => {
  it("deletes a theme", async () => {
    mockData.current = [{ id: "t1", userId: "user-1", name: "Gone", theme: "{}", isActive: "false" }]
    const res = await request(app).delete("/api/themes/t1").set(authHeader())
    expect(res.status).toBe(200)
  })

  it("returns 404 for non-existent theme", async () => {
    const res = await request(app).delete("/api/themes/nonexistent").set(authHeader())
    expect(res.status).toBe(404)
  })
})

describe("POST /api/themes/:id/activate", () => {
  it("activates a theme", async () => {
    mockData.current = [{ id: "t1", userId: "user-1", name: "Active", theme: "{}", isActive: "false" }]
    const res = await request(app).post("/api/themes/t1/activate").set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Theme activated")
  })

  it("returns 404 for non-existent theme", async () => {
    const res = await request(app).post("/api/themes/nonexistent/activate").set(authHeader())
    expect(res.status).toBe(404)
  })
})
