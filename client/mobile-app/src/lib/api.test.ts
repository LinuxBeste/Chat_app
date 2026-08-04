import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { api, setTokens, clearTokens, getTokens, refreshAccess, uploadFile } from "./api"
import AsyncStorage from "@react-native-async-storage/async-storage"

vi.mock("expo-file-system/next", () => {
  class MockFile {
    uri: string
    constructor(first: string, name?: string) {
      this.uri = name ? `${first.replace(/\/+$/, "")}/${name}` : first
    }
    copy() {}
  }
  return {
    File: MockFile,
    Paths: { cache: "/mock/cache" },
    default: {},
  }
})

describe("api", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

describe("uploadFile", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  function stubXhr(response: { status: number; body: string } | { error: true }) {
    function FakeFormData(this: any) {
      const appends: { key: string; value: unknown }[] = []
      this.append = (key: string, value: unknown) => {
        appends.push({ key, value })
      }
      this.getAppends = () => appends
    }
    vi.stubGlobal("FormData", FakeFormData)
    class FakeXhr {
      status = 0
      responseText = ""
      timeout = 0
      private headers: Record<string, string> = {}
      private formParts: { key: string; value: unknown }[] = []
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      ontimeout: (() => void) | null = null
      open = vi.fn((_method: string, _url: string) => {})
      setRequestHeader = vi.fn((key: string, value: string) => {
        this.headers[key] = value
      })
      send = vi.fn((formData: any) => {
        this.formParts = formData?.getAppends?.() ?? []
        if ("error" in response) {
          this.onerror?.()
        } else {
          this.status = response.status
          this.responseText = response.body
          this.onload?.()
        }
      })
      getHeaders = () => this.headers
      getParts = () => this.formParts
    }
    const instance = new FakeXhr()
    function FakeXhrCtor() {
      return instance
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhrCtor)
    return instance as unknown as FakeXhr & {
      getHeaders: () => Record<string, string>
      getParts: () => { key: string; value: unknown }[]
    }
  }

  it("uploads a file via XHR multipart with auth header", async () => {
    await setTokens("token-123", "refresh-456")
    const xhr = stubXhr({
      status: 201,
      body: JSON.stringify({ url: "/uploads/x.png", filename: "x.png", mimeType: "image/png", size: 100 }),
    })

    const result = await uploadFile({ uri: "file:///a.png", name: "a.png", type: "image/png" })

    expect(result).toEqual({ url: "/uploads/x.png", filename: "x.png", mimeType: "image/png", size: 100 })
    expect(xhr.open).toHaveBeenCalledWith("POST", expect.stringContaining("/api/uploads"))
    expect(xhr.getHeaders()).toEqual(expect.objectContaining({ Authorization: "Bearer token-123" }))
    expect(xhr.getParts()).toEqual([
      { key: "file", value: expect.objectContaining({ uri: "file:///a.png", name: "a.png", type: "image/png" }) },
    ])
  })

  it("sends the conversation id as a form field", async () => {
    await setTokens("token-123", "refresh-456")
    const xhr = stubXhr({ status: 201, body: JSON.stringify({}) })

    await uploadFile({ uri: "file:///a.png", name: "a.png", type: "image/png", conversationId: "c1" })

    expect(xhr.getParts()).toEqual([
      { key: "conversationId", value: "c1" },
      { key: "file", value: expect.objectContaining({ uri: "file:///a.png", name: "a.png", type: "image/png" }) },
    ])
  })

  it("copies content:// URIs into the cache before uploading", async () => {
    await setTokens("token-123", "refresh-456")
    const xhr = stubXhr({ status: 201, body: JSON.stringify({}) })

    await uploadFile({ uri: "content://downloads/42", name: "report.pdf", type: "application/pdf" })

    expect(xhr.getParts()).toEqual([
      {
        key: "file",
        value: expect.objectContaining({
          uri: expect.stringMatching(/^\/mock\/cache\/pending-\d+-report\.pdf$/),
          name: "report.pdf",
          type: "application/pdf",
        }),
      },
    ])
  })

  it("infers an extension when the file name has none", async () => {
    await setTokens("token-123", "refresh-456")
    const xhr = stubXhr({ status: 201, body: JSON.stringify({}) })

    await uploadFile({ uri: "content://downloads/42", name: "report", type: "application/pdf" })

    expect(xhr.getParts()).toEqual([{ key: "file", value: expect.objectContaining({ name: "report.pdf" }) }])
  })

  it("throws with status on upload failure", async () => {
    await setTokens("token-123", "refresh-456")
    stubXhr({ status: 500, body: JSON.stringify({ error: "FILE_TOO_LARGE" }) })

    await expect(uploadFile({ uri: "file:///a.png", name: "a.png" })).rejects.toThrow(
      "Upload failed: 500 (FILE_TOO_LARGE)",
    )
  })

  it("throws a network error when the request fails", async () => {
    await setTokens("token-123", "refresh-456")
    stubXhr({ error: true })

    await expect(uploadFile({ uri: "file:///a.png", name: "a.png" })).rejects.toThrow()
  })

  it("throws when the server returns invalid json", async () => {
    await setTokens("token-123", "refresh-456")
    stubXhr({ status: 201, body: "not json" })

    await expect(uploadFile({ uri: "file:///a.png", name: "a.png" })).rejects.toThrow(
      "Upload failed: invalid server response (201)",
    )
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
