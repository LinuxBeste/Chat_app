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
    returning: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    onConflictDoUpdate: vi.fn(() => Promise.resolve(undefined)),
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

function totp(secret: string): string {
  let counter = Math.floor(Date.now() / 30000)
  const buf = Buffer.alloc(8)
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff
    counter >>= 8
  }
  const crypto = require("crypto")
  const hmac = crypto.createHmac("sha1", Buffer.from(secret, "hex")).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1000000).padStart(6, "0")
}

const USER_ID = "u1"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyToken).mockReturnValue({ userId: USER_ID, username: "test" })
  mockData.current = []
})

describe("POST /api/security/totp/setup", () => {
  it("creates a TOTP secret", async () => {
    const res = await request(app).post("/api/security/totp/setup").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("secret")
    expect(res.body).toHaveProperty("uri")
    expect(res.body.uri).toContain("otpauth://totp/")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/security/totp/setup")
    expect(res.status).toBe(401)
  })
})

describe("POST /api/security/totp/verify", () => {
  it("verifies with a valid code", async () => {
    const secret = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
    mockData.current = [{ userId: USER_ID, secret, verified: "false" }]
    const code = totp(secret)
    const res = await request(app).post("/api/security/totp/verify").set("Authorization", "Bearer token").send({ code })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "2FA enabled")
  })

  it("returns 400 with invalid code", async () => {
    mockData.current = [{ userId: USER_ID, secret: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0", verified: "false" }]
    const res = await request(app)
      .post("/api/security/totp/verify")
      .set("Authorization", "Bearer token")
      .send({ code: "000000" })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("error", "Invalid code")
  })

  it("returns 400 when TOTP not set up", async () => {
    const res = await request(app)
      .post("/api/security/totp/verify")
      .set("Authorization", "Bearer token")
      .send({ code: "123456" })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("error", "TOTP not set up")
  })

  it("returns 400 with invalid body (code not 6 chars)", async () => {
    const res = await request(app)
      .post("/api/security/totp/verify")
      .set("Authorization", "Bearer token")
      .send({ code: "123" })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("error", "Validation failed")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/security/totp/verify").send({ code: "123456" })
    expect(res.status).toBe(401)
  })
})

describe("POST /api/security/totp/disable", () => {
  it("disables 2FA", async () => {
    const res = await request(app).post("/api/security/totp/disable").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("message", "2FA disabled")
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/security/totp/disable")
    expect(res.status).toBe(401)
  })
})

describe("POST /api/security/totp/setup with existing record", () => {
  it("upserts when TOTP already exists", async () => {
    const res = await request(app).post("/api/security/totp/setup").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("secret")
    expect(res.body).toHaveProperty("uri")
  })
})

describe("GET /api/security/totp/status", () => {
  it("returns enabled when verified", async () => {
    mockData.current = [{ userId: USER_ID, verified: "true" }]
    const res = await request(app).get("/api/security/totp/status").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: true })
  })

  it("returns disabled when no record exists", async () => {
    const res = await request(app).get("/api/security/totp/status").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: false })
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/security/totp/status")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/security/history", () => {
  it("returns login history", async () => {
    mockData.current = [
      {
        id: "h1",
        userId: USER_ID,
        ip: "127.0.0.1",
        userAgent: "test",
        success: "true",
        createdAt: new Date().toISOString(),
      },
    ]
    const res = await request(app).get("/api/security/history").set("Authorization", "Bearer token")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
  })

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/security/history")
    expect(res.status).toBe(401)
  })
})
