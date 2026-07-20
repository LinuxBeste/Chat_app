import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { api, setTokens } from "./api"

describe("api", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("makes a GET request with auth header", async () => {
    setTokens("access-123", "refresh-456")
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal("fetch", fetchMock)

    await api("/api/conversations")

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-123",
        }),
      }),
    )
  })

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Bad request" }),
      }),
    )

    await expect(api("/api/test")).rejects.toThrow("Bad request")
  })

  it("returns data on success", async () => {
    const data = { id: "1", name: "test" }
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      }),
    )

    const result = await api("/api/test")
    expect(result).toEqual(data)
  })

  it("returns undefined on 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(),
      }),
    )

    const result = await api("/api/delete")
    expect(result).toBeUndefined()
  })

  it("auto-refreshes token on 401", async () => {
    setTokens("old-token", "refresh-token")

    let callCount = 0
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("auth/refresh")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ accessToken: "new-token", refreshToken: "new-refresh" }),
        })
      }
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "data" }),
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await api("/api/data")
    expect(result).toEqual({ id: "data" })
    expect(localStorage.getItem("accessToken")).toBe("new-token")
  })
})
