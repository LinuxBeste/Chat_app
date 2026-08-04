import { describe, it, expect, vi, beforeEach } from "vitest"
import { Share } from "react-native"
import { downloadAndShare } from "./download"

vi.mock("expo-file-system/next", () => {
  class MockFile {
    uri: string
    static downloadFileAsync = vi.fn((_url: string, to: MockFile) => Promise.resolve(to))
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

const File = (await import("expo-file-system/next")).File as any

describe("downloadAndShare", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("downloads the file into the cache and shares the local uri", async () => {
    const shareSpy = vi.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" as never })

    await downloadAndShare("https://server.example/uploads/x.pdf", "report.pdf")

    expect(File.downloadFileAsync).toHaveBeenCalledWith("https://server.example/uploads/x.pdf", expect.any(File))
    const target = File.downloadFileAsync.mock.calls[0][1]
    expect(target.uri).toMatch(/^\/mock\/cache\/\d+-report\.pdf$/)
    expect(shareSpy).toHaveBeenCalledWith({ url: target.uri })
  })

  it("falls back to a safe name when the filename is empty", async () => {
    const shareSpy = vi.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" as never })

    await downloadAndShare("https://server.example/uploads/x", "")

    const target = File.downloadFileAsync.mock.calls[0][1]
    expect(target.uri).toMatch(/^\/mock\/cache\/\d+-file$/)
    expect(shareSpy).toHaveBeenCalledWith({ url: target.uri })
  })
})
