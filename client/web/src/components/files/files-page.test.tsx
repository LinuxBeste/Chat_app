import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { FilesPage } from "./files-page"

const mockFiles = [
  {
    id: "file-1",
    url: "/uploads/photo.jpg",
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    size: 102400,
    createdAt: "2024-01-01T12:00:00Z",
    messageId: null,
    folderId: null,
  },
  {
    id: "file-2",
    url: "/uploads/video.mp4",
    filename: "video.mp4",
    mimeType: "video/mp4",
    size: 5242880,
    createdAt: "2024-01-02T12:00:00Z",
    messageId: null,
    folderId: null,
  },
]

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
}))

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
  apiFormData: vi.fn(),
  BASE_URL: "http://localhost:3000",
}))

vi.mock("../../lib/toast-context", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}))

import { api } from "../../lib/api"

describe("FilesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the Files heading", async () => {
    // first call: /api/files/list, second call: /api/files/folders
    vi.mocked(api).mockResolvedValueOnce([])
    vi.mocked(api).mockResolvedValueOnce([])
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("files.title")).toBeInTheDocument()
    })
  })

  it("lists files from the API", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    vi.mocked(api).mockResolvedValueOnce([])
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument()
    })
    expect(screen.getByText("video.mp4")).toBeInTheDocument()
  })

  it("shows file size and type", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    vi.mocked(api).mockResolvedValueOnce([])
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText(/100 KB/)).toBeInTheDocument()
    })
  })

  it("shows empty state when no files", async () => {
    vi.mocked(api).mockResolvedValueOnce([])
    vi.mocked(api).mockResolvedValueOnce([])
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("files.noFiles")).toBeInTheDocument()
    })
  })

  it("handles API error gracefully", async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error("Network error"))
    vi.mocked(api).mockRejectedValueOnce(new Error("Network error"))
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("files.title")).toBeInTheDocument()
    })
  })

  it("shows download links for files", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    vi.mocked(api).mockResolvedValueOnce([])
    render(<FilesPage />)
    await waitFor(() => {
      const links = screen.getAllByLabelText("files.download")
      expect(links).toHaveLength(2)
      expect(links[0]).toHaveAttribute("href", "http://localhost:3000/uploads/photo.jpg")
    })
  })
})
