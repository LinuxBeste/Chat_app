import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { api, setTokens, clearTokens, getTokens, refreshAccess, apiFormData } from "./api"
import AsyncStorage from "@react-native-async-storage/async-storage"

describe("api", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("makes a GET request with auth header", async () => {
    await setTokens("access-123", "refresh-456")
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

  it("sets Content-Type application/json by default", async () => {
    await setTokens("access-123", "refresh-456")
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal("fetch", fetchMock)

    await api("/api/test")

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
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
      }),
    )

    const result = await api("/api/delete")
    expect(result).toBeUndefined()
  })

  it("includes base URL from env", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }),
    )

    await api("/api/health")

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^(http:\/\/localhost:3000|\/api\/health)/),
      expect.any(Object),
    )
  })

  it("retries with refreshed token on 401", async () => {
    await setTokens("old-token", "refresh-token")

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
    const at = await AsyncStorage.getItem("@accessToken")
    const rt = await AsyncStorage.getItem("@refreshToken")
    expect(at).toBe("new-token")
    expect(rt).toBe("new-refresh")
  })

  it("clears tokens when refresh fails", async () => {
    await setTokens("old-token", "refresh-token")

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("auth/refresh")) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(api("/api/data")).rejects.toThrow()
    const at = await AsyncStorage.getItem("@accessToken")
    const rt = await AsyncStorage.getItem("@refreshToken")
    expect(at).toBeNull()
    expect(rt).toBeNull()
  })
})

describe("apiFormData", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it("uploads form data with auth header", async () => {
    await setTokens("token-123", "refresh-456")
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ url: "http://example.com/file" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const form = new FormData()
    form.append("file", "test")
    const result = await apiFormData("/api/uploads", form)

    expect(result).toEqual({ url: "http://example.com/file" })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/uploads"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    )
  })

  it("throws on upload failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(apiFormData("/api/upload", new FormData())).rejects.toThrow("Upload failed: 500")
  })
})

describe("token helpers", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it("setTokens stores both tokens", async () => {
    await setTokens("at", "rt")
    expect(await AsyncStorage.getItem("@accessToken")).toBe("at")
    expect(await AsyncStorage.getItem("@refreshToken")).toBe("rt")
  })

  it("getTokens returns stored tokens", async () => {
    await setTokens("at1", "rt1")
    const tokens = await getTokens()
    expect(tokens).toEqual({ accessToken: "at1", refreshToken: "rt1" })
  })

  it("clearTokens removes both tokens", async () => {
    await setTokens("at", "rt")
    await clearTokens()
    expect(await AsyncStorage.getItem("@accessToken")).toBeNull()
    expect(await AsyncStorage.getItem("@refreshToken")).toBeNull()
  })
})

describe("refreshAccess", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it("returns null when no refresh token exists", async () => {
    const result = await refreshAccess()
    expect(result).toBeNull()
  })
})
