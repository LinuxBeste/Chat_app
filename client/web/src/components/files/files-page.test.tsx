import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { FilesPage } from "./files-page"

const mockConversations = [{ id: "conv-1", type: "dm", name: "Test", createdAt: "2024-01-01T00:00:00Z" }]

const mockFiles = [
  {
    id: "file-1",
    content: "photo.jpg",
    createdAt: "2024-01-01T12:00:00Z",
    sender: { username: "Alice" },
    attachment: { url: "http://example.com/photo.jpg", filename: "photo.jpg", mimeType: "image/jpeg", size: 102400 },
  },
  {
    id: "file-2",
    content: "video.mp4",
    createdAt: "2024-01-02T12:00:00Z",
    sender: { username: "Bob" },
    attachment: { url: "http://example.com/video.mp4", filename: "video.mp4", mimeType: "video/mp4", size: 5242880 },
  },
]

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}))

import { api } from "../../lib/api"

describe("FilesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the Shared Files heading", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockConversations)
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("Shared Files")).toBeInTheDocument()
    })
  })

  it("lists files from the API", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockConversations)
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument()
    })
    expect(screen.getByText("video.mp4")).toBeInTheDocument()
  })

  it("shows file sender and size", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockConversations)
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Bob/)).toBeInTheDocument()
  })

  it("shows empty state when no files", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockConversations)
    vi.mocked(api).mockResolvedValueOnce([])
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("No files shared yet")).toBeInTheDocument()
    })
  })

  it("handles API error gracefully", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Network error"))
    render(<FilesPage />)
    await waitFor(() => {
      expect(screen.getByText("Shared Files")).toBeInTheDocument()
    })
  })

  it("shows download links for files", async () => {
    vi.mocked(api).mockResolvedValueOnce(mockConversations)
    vi.mocked(api).mockResolvedValueOnce(mockFiles)
    render(<FilesPage />)
    await waitFor(() => {
      const links = screen.getAllByLabelText("Download file")
      expect(links).toHaveLength(2)
      expect(links[0]).toHaveAttribute("href", "http://example.com/photo.jpg")
    })
  })
})
