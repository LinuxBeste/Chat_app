import { describe, it, expect, vi, beforeEach } from "vitest"
import { authGuard } from "./auth.js"

vi.mock("../lib/db.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock("../lib/jwt.js", () => ({
  verifyToken: vi.fn(),
}))

import { verifyToken } from "../lib/jwt.js"
import { db } from "../lib/db.js"

function createReqRes(authHeader?: string, apiKey?: string) {
  const req = {
    headers: {} as Record<string, string>,
  } as any
  if (authHeader) req.headers.authorization = authHeader
  if (apiKey) req.headers["x-api-key"] = apiKey
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any
  const next = vi.fn()
  return { req, res, next }
}

describe("authGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls next() with valid Bearer token", async () => {
    vi.mocked(verifyToken).mockReturnValue({ userId: "u1", username: "test" })
    const { req, res, next } = createReqRes("Bearer valid-token")
    await authGuard(req, res, next)
    expect(verifyToken).toHaveBeenCalledWith("valid-token")
    expect(req.user).toEqual({ userId: "u1", username: "test" })
    expect(next).toHaveBeenCalled()
  })

  it("returns 401 when no auth header", async () => {
    const { req, res, next } = createReqRes()
    await authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing or invalid authorization header" })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 when header does not start with Bearer", async () => {
    const { req, res, next } = createReqRes("Basic dXNlcjpwYXNz")
    await authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("returns 401 when token is invalid", async () => {
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error("jwt error")
    })
    const { req, res, next } = createReqRes("Bearer bad-token")
    await authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" })
  })

  it("calls next() with valid API key", async () => {
    ;(db as any).limit.mockResolvedValueOnce([{ userId: "u1", expiresAt: new Date(Date.now() + 86400000) }])
    const { req, res, next } = createReqRes(undefined, "valid-api-key")
    await authGuard(req, res, next)
    expect(req.user).toEqual({ userId: "u1", username: "" })
    expect(next).toHaveBeenCalled()
  })

  it("returns 401 with expired API key", async () => {
    ;(db as any).limit.mockResolvedValueOnce([{ userId: "u1", expiresAt: new Date("2020-01-01") }])
    const { req, res, next } = createReqRes(undefined, "expired-api-key")
    await authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired API key" })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 with invalid API key (no matching record)", async () => {
    ;(db as any).limit.mockResolvedValueOnce([])
    const { req, res, next } = createReqRes(undefined, "invalid-api-key")
    await authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired API key" })
    expect(next).not.toHaveBeenCalled()
  })

  it("handles concurrent requests with valid Bearer tokens", async () => {
    vi.mocked(verifyToken).mockReturnValue({ userId: "u1", username: "test" })
    const { req: r1, res: rs1, next: n1 } = createReqRes("Bearer token-1")
    const { req: r2, res: rs2, next: n2 } = createReqRes("Bearer token-2")
    await Promise.all([authGuard(r1, rs1, n1), authGuard(r2, rs2, n2)])
    expect(n1).toHaveBeenCalled()
    expect(n2).toHaveBeenCalled()
    expect(r1.user).toEqual({ userId: "u1", username: "test" })
    expect(r2.user).toEqual({ userId: "u1", username: "test" })
  })

  it("handles concurrent requests with mixed valid and invalid tokens", async () => {
    vi.mocked(verifyToken).mockReturnValueOnce({ userId: "u1", username: "test" })
    vi.mocked(verifyToken).mockImplementationOnce(() => {
      throw new Error("jwt error")
    })
    const { req: r1, res: rs1, next: n1 } = createReqRes("Bearer good-token")
    const { req: r2, res: rs2, next: n2 } = createReqRes("Bearer bad-token")
    await Promise.all([authGuard(r1, rs1, n1), authGuard(r2, rs2, n2)])
    expect(n1).toHaveBeenCalled()
    expect(n2).not.toHaveBeenCalled()
    expect(rs2.status).toHaveBeenCalledWith(401)
  })

  it("handles concurrent requests with mixed API keys", async () => {
    ;(db as any).limit.mockResolvedValueOnce([{ userId: "u1", expiresAt: new Date(Date.now() + 86400000) }])
    ;(db as any).limit.mockResolvedValueOnce([])
    const { req: r1, res: rs1, next: n1 } = createReqRes(undefined, "valid-key")
    const { req: r2, res: rs2, next: n2 } = createReqRes(undefined, "invalid-key")
    await Promise.all([authGuard(r1, rs1, n1), authGuard(r2, rs2, n2)])
    expect(n1).toHaveBeenCalled()
    expect(n2).not.toHaveBeenCalled()
    expect(rs2.status).toHaveBeenCalledWith(401)
  })
})
