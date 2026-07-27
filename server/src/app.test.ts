import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs"
import { resolve } from "path"

const uploadsDir = resolve(process.cwd(), "data", "uploads")
const testFile = "vitest-static-test.txt"
const testFilePath = resolve(uploadsDir, testFile)

beforeAll(() => {
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true })
  }
  writeFileSync(testFilePath, "hello from static")
})

afterAll(() => {
  try {
    unlinkSync(testFilePath)
  } catch { /* Ignored */ }
})

import app from "./app.js"

describe("App", () => {
  it("health endpoint returns 200", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("status", "ok")
  })

  it("sets CORS headers", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:5173")
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173")
    expect(res.headers["access-control-allow-credentials"]).toBe("true")
  })

  it("parses JSON body", async () => {
    const res = await request(app).post("/health").send({ test: true })
    expect(res.status).toBe(404)
  })

  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/this-route-does-not-exist")
    expect(res.status).toBe(404)
  })

  it("serves static files", async () => {
    const res = await request(app).get(`/uploads/${testFile}`)
    expect(res.status).toBe(200)
    expect(res.text).toBe("hello from static")
  })
})
