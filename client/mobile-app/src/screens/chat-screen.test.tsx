import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { ChatScreen } from "./chat-screen"
import { cacheClear } from "../lib/offline-cache"

const mockApi = vi.fn()

vi.mock("../lib/api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  apiFormData: vi.fn(),
  BASE_URL: "http://localhost:3000",
}))

vi.mock("../lib/ws", () => ({
  wsClient: {
    on: vi.fn(() => () => {}),
    send: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

vi.mock("../lib/crypto", () => ({
  encryptMessage: vi.fn((c: string) => `e2ee:${c}`),
  decryptMessage: vi.fn((_id: string, content: string) => Promise.resolve(content)),
  isEncrypted: vi.fn(() => false),
  stripEncryptionPrefix: vi.fn((c: string) => c),
}))

vi.mock("../lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "me", username: "me", displayName: "Me" },
    loading: false,
    logout: vi.fn(),
  }),
}))

const convInfo = (muted: boolean) => ({
  id: "c1",
  type: "group",
  name: "Test Group",
  members: [{ id: "me", username: "me", role: "owner" }],
  muted,
})

const defaultMock = (muted: boolean) => {
  mockApi.mockImplementation((path: string) => {
    if (path === "/api/conversations/c1") return Promise.resolve(convInfo(muted))
    if (path === "/api/conversations/c1/messages") return Promise.resolve([])
    if (path === "/api/pins/c1") return Promise.resolve([])
    return Promise.resolve([])
  })
}

beforeEach(async () => {
  vi.clearAllMocks()
  await cacheClear()
  defaultMock(false)
})

afterEach(() => {
  cleanup()
})

const openInfoPanel = async () => {
  await waitFor(() => expect(screen.getByText("Test Group")).toBeInTheDocument())
  fireEvent.click(screen.getByText("Test Group"))
}

describe("ChatScreen mute", () => {
  it("loads the muted state from the conversation detail", async () => {
    defaultMock(true)
    render(<ChatScreen conversationId="c1" onBack={vi.fn()} />)
    await openInfoPanel()
    await waitFor(() => expect(screen.getByText("Unmute")).toBeInTheDocument())
  })

  it("mutes the conversation via the server", async () => {
    render(<ChatScreen conversationId="c1" onBack={vi.fn()} />)
    await openInfoPanel()
    fireEvent.click(await screen.findByText("Mute"))
    await waitFor(() => expect(mockApi).toHaveBeenCalledWith("/api/conversations/c1/mute", { method: "PUT" }))
    expect(screen.getByText("Unmute")).toBeInTheDocument()
  })

  it("unmutes the conversation via the server", async () => {
    render(<ChatScreen conversationId="c1" onBack={vi.fn()} />)
    await openInfoPanel()
    fireEvent.click(await screen.findByText("Mute"))
    await waitFor(() => expect(screen.getByText("Unmute")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Unmute"))
    await waitFor(() => expect(mockApi).toHaveBeenCalledWith("/api/conversations/c1/mute", { method: "DELETE" }))
  })
})
