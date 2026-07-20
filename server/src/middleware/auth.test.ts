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
    vi.mocked(verifyToken).mockImplementation(() => { throw new Error("jwt error") })
    const { req, res, next } = createReqRes("Bearer bad-token")
    await authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" })
  })
})
