import { describe, it, expect, vi } from "vitest"
import { errorHandler } from "./error-handler.js"
import { AppError } from "../lib/app-error.js"

function createReqRes() {
  const req = {} as any
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any
  const next = vi.fn()
  return { req, res, next }
}

describe("errorHandler", () => {
  it("handles AppError with status and code", () => {
    const { req, res, next } = createReqRes()
    const err = new AppError(404, "NOT_FOUND", "User not found")
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "NOT_FOUND", message: "User not found" })
  })

  it("includes details when present", () => {
    const { req, res, next } = createReqRes()
    const err = new AppError(400, "VALIDATION", "Invalid input", { field: "email" })
    errorHandler(err, req, res, next)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ details: { field: "email" } }))
  })

  it("handles JSON parse errors", () => {
    const { req, res, next } = createReqRes()
    const err = new SyntaxError("Unexpected token") as any
    err.body = true
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "PARSE_ERROR", message: "Invalid JSON body" })
  })

  it("returns 500 for unknown errors", () => {
    const { req, res, next } = createReqRes()
    const err = new Error("Something broke")
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_ERROR", message: "Internal server error" })
  })
})
