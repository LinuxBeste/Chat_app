import { describe, it, expect, vi } from "vitest"

vi.mock("dotenv", () => ({ config: vi.fn() }))

vi.hoisted(() => {
  delete process.env.PORT
  delete process.env.HOST
  delete process.env.API_PREFIX
  delete process.env.JWT_SECRET
  delete process.env.BCRYPT_ROUNDS
  delete process.env.WS_HEARTBEAT_INTERVAL
  delete process.env.MAX_FILE_SIZE
})

import { config } from "../config.js"

describe("config defaults", () => {
  it("has default port 3000", () => {
    expect(config.port).toBe(3000)
  })

  it("has default host 0.0.0.0", () => {
    expect(config.host).toBe("0.0.0.0")
  })

  it("has default api prefix /api", () => {
    expect(config.apiPrefix).toBe("/api")
  })

  it("has default jwt secret", () => {
    expect(config.jwt.secret).toBe("dev-secret-change-me")
  })

  it("has default bcrypt rounds", () => {
    expect(config.bcrypt.rounds).toBe(12)
  })

  it("has default upload max file size", () => {
    expect(config.uploads.maxFileSize).toBe(26214400)
  })
})
