import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { FilesScreen } from "./files-screen"
import * as WebBrowser from "expo-web-browser"
import * as Clipboard from "expo-clipboard"
import { Linking } from "react-native"
import { resetServerUrl } from "../lib/server-config"

const mockApi = vi.fn()

vi.mock("../lib/api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(() => Promise.resolve({ url: "/uploads/x.png", filename: "x.png", mimeType: "image/png", size: 100 })),
  BASE_URL: "http://localhost:3000",
}))

const files = [
  { id: "f1", name: "photo.png", type: "image/png", size: 2048, url: "/uploads/photo.png" },
  { id: "f2", name: "notes.txt", type: "text/plain", size: 512, url: "/uploads/notes.txt" },
  { id: "f3", name: "manual.pdf", type: "application/pdf", size: 4096, url: "/uploads/manual.pdf" },
  { id: "f4", name: "archive.zip", type: "application/zip", size: 8192, url: "/uploads/archive.zip" },
]

beforeEach(async () => {
  vi.clearAllMocks()
  await AsyncStorage.clear()
  await resetServerUrl()
  mockApi.mockImplementation((path: string) => {
    if (path === "/api/files/list") return Promise.resolve(files)
    if (path === "/api/files/folders") return Promise.resolve([])
    return Promise.resolve([])
  })
})

afterEach(async () => {
  await resetServerUrl()
})

describe("FilesScreen", () => {
  it("renders file names from the server", async () => {
    render(<FilesScreen />)
    await waitFor(() => expect(screen.getByText("photo.png")).toBeInTheDocument())
    expect(screen.getByText("notes.txt")).toBeInTheDocument()
    expect(screen.getByText("manual.pdf")).toBeInTheDocument()
  })

  it("resolves relative URLs to the server base for image thumbnails", async () => {
    render(<FilesScreen />)
    const img = await screen.findByRole("img")
    await waitFor(() => expect(img).toHaveAttribute("src", "http://localhost:3000/uploads/photo.png"))
  })

  it("previews text files by fetching their content", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve("hello world content") } as Response),
    )
    vi.stubGlobal("fetch", fetchMock)
    render(<FilesScreen />)
    fireEvent.click(await screen.findByText("notes.txt"))
    await waitFor(() => expect(screen.getByText("hello world content")).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/uploads/notes.txt")
    vi.unstubAllGlobals()
  })

  it("shows an error state when text preview fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false } as Response)),
    )
    render(<FilesScreen />)
    fireEvent.click(await screen.findByText("notes.txt"))
    await waitFor(() => expect(screen.getByText("Could not load text preview")).toBeInTheDocument())
    vi.unstubAllGlobals()
  })

  it("opens PDFs in the in-app browser", async () => {
    render(<FilesScreen />)
    fireEvent.click(await screen.findByText("manual.pdf"))
    const openButton = await screen.findByText("Open PDF")
    fireEvent.click(openButton)
    await waitFor(() =>
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("http://localhost:3000/uploads/manual.pdf"),
    )
  })

  it("opens non-previewable files externally via Linking", async () => {
    const openSpy = vi.spyOn(Linking, "openURL")
    render(<FilesScreen />)
    fireEvent.click(await screen.findByText("archive.zip"))
    fireEvent.click(await screen.findByText("Download"))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith("http://localhost:3000/uploads/archive.zip"))
  })

  it("copies the absolute URL to the clipboard", async () => {
    render(<FilesScreen />)
    fireEvent.click(await screen.findByText("photo.png"))
    fireEvent.click(await screen.findByText("Copy URL"))
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("http://localhost:3000/uploads/photo.png"),
    )
  })

  it("shows a placeholder when there are no files", async () => {
    mockApi.mockImplementation((path: string) => {
      if (path === "/api/files/list") return Promise.resolve([])
      if (path === "/api/files/folders") return Promise.resolve([])
      return Promise.resolve([])
    })
    render(<FilesScreen />)
    await waitFor(() => expect(screen.getByText("No files")).toBeInTheDocument())
  })
})
