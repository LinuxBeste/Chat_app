import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { resizeImage, saveAvatar, saveAndScaleUpload } from "./image.js"

vi.mock("sharp", () => {
  const mockChain: any = {
    metadata: vi.fn().mockResolvedValue({ width: 2000, height: 1500 }),
    resize: vi.fn(() => mockChain),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized")),
  }
  const mockSharp = vi.fn(() => mockChain)
  return { default: mockSharp }
})

vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  createWriteStream: vi.fn(() => ({ on: vi.fn(), end: vi.fn() })),
}))

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("uuid", () => ({ v4: () => "test-uuid" }))

vi.mock("../config.js", () => ({
  config: { uploads: { dir: "/tmp/uploads" } },
}))

import sharp from "sharp"

describe("image utilities", () => {
  const testBuffer = Buffer.from("fake-image-data")

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("resizeImage", () => {
    it("resizes image when dimensions exceed max", async () => {
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 2000, height: 1500 }),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized")),
      } as any)
      const result = await resizeImage(testBuffer, 1920, 1920)
      expect(result).toBeTruthy()
    })

    it("returns original buffer when within limits", async () => {
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized")),
      } as any)
      const result = await resizeImage(testBuffer, 1920, 1920)
      expect(result).toEqual(testBuffer)
    })
  })

  describe("saveAvatar", () => {
    it("saves avatar and returns url path", async () => {
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 500, height: 500 }),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("avatar")),
      } as any)
      const url = await saveAvatar(testBuffer)
      expect(url).toMatch(/^\/uploads\/avatars\//)
    })
  })

  describe("saveAndScaleUpload", () => {
    it("saves image file and returns metadata with jpeg mime", async () => {
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 2000, height: 1500 }),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized")),
      } as any)
      const result = await saveAndScaleUpload(testBuffer, "test.jpg")
      expect(result).toHaveProperty("url")
      expect(result).toHaveProperty("filename", "test.jpg")
      expect(result).toHaveProperty("mimeType", "image/jpeg")
      expect(result).toHaveProperty("size")
    })

    it("saves non-image file without resizing", async () => {
      const result = await saveAndScaleUpload(testBuffer, "test.pdf")
      expect(result).toHaveProperty("filename", "test.pdf")
      expect(result).toHaveProperty("mimeType", "application/octet-stream")
    })
  })
})
