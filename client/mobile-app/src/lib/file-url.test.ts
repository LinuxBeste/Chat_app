import { describe, it, expect, beforeEach } from "vitest"
import { resolveFileUrl } from "./file-url"
import { setServerUrl, resetServerUrl } from "./server-config"

describe("file-url", () => {
  beforeEach(async () => {
    await resetServerUrl()
  })

  it("returns null for empty input", async () => {
    await expect(resolveFileUrl(null)).resolves.toBeNull()
    await expect(resolveFileUrl(undefined)).resolves.toBeNull()
    await expect(resolveFileUrl("")).resolves.toBeNull()
  })

  it("prepends the server base for relative paths", async () => {
    await setServerUrl("http://192.168.1.5:3000")
    await expect(resolveFileUrl("/uploads/abc.png")).resolves.toBe("http://192.168.1.5:3000/uploads/abc.png")
  })

  it("adds a leading slash when missing", async () => {
    await setServerUrl("http://192.168.1.5:3000")
    await expect(resolveFileUrl("uploads/abc.png")).resolves.toBe("http://192.168.1.5:3000/uploads/abc.png")
  })

  it("leaves absolute http(s) URLs untouched", async () => {
    await setServerUrl("http://192.168.1.5:3000")
    await expect(resolveFileUrl("https://cdn.example.com/file.pdf")).resolves.toBe("https://cdn.example.com/file.pdf")
    await expect(resolveFileUrl("http://cdn.example.com/file.pdf")).resolves.toBe("http://cdn.example.com/file.pdf")
  })

  it("leaves file:// URLs untouched", async () => {
    await setServerUrl("http://192.168.1.5:3000")
    await expect(resolveFileUrl("file:///tmp/foo.txt")).resolves.toBe("file:///tmp/foo.txt")
  })

  it("uses the default server when nothing is configured", async () => {
    await expect(resolveFileUrl("/uploads/a.png")).resolves.toBe("http://localhost:3000/uploads/a.png")
  })
})
