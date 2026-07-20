import { describe, it, expect, vi } from "vitest"
import { validate } from "./validate.js"
import { z } from "zod"

function createReqRes(body: unknown) {
  const req = { body } as any
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any
  const next = vi.fn()
  return { req, res, next }
}

describe("validate middleware", () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().min(18) })

  it("passes valid data to next()", () => {
    const { req, res, next } = createReqRes({ name: "Alice", age: 25 })
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(req.body.name).toBe("Alice")
  })

  it("rejects invalid data with 400", () => {
    const { req, res, next } = createReqRes({ name: "", age: 15 })
    validate(schema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Validation failed" }),
    )
  })

  it("rejects missing fields", () => {
    const { req, res, next } = createReqRes({ name: "Bob" })
    validate(schema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Validation failed" }),
    )
  })

  it("uses specified source (query)", () => {
    const req = { query: { q: "test" } } as any
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    const next = vi.fn()
    const querySchema = z.object({ q: z.string().min(1) })
    validate(querySchema, "query")(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.query.q).toBe("test")
  })
})
