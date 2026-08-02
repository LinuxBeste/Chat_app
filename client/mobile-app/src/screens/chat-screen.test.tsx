import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { ChatScreen } from "./chat-screen"
import { ToastProvider } from "../lib/toast-context"
import { cacheClear } from "../lib/offline-cache"

const { wsHandlers, wsSend, mockApiFormData } = vi.hoisted(() => ({
  wsHandlers: {} as Record<string, ((data?: any) => void)[]>,
  wsSend: vi.fn(),
  mockApiFormData: vi.fn(),
}))

const mockApi = vi.fn()

vi.mock("../lib/api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  apiFormData: mockApiFormData,
  BASE_URL: "http://localhost:3000",
}))

vi.mock("../lib/ws", () => ({
  wsClient: {
    on: vi.fn((type: string, cb: (data?: any) => void) => {
      ;(wsHandlers[type] ||= []).push(cb)
      return () => {
        wsHandlers[type] = wsHandlers[type].filter((f) => f !== cb)
      }
    }),
    send: wsSend,
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
  Object.keys(wsHandlers).forEach((k) => delete wsHandlers[k])
  await cacheClear()
  defaultMock(false)
  mockApiFormData.mockImplementation(() =>
    Promise.resolve({ url: "/uploads/x.png", filename: "x.png", mimeType: "image/png", size: 100 }),
  )
})

afterEach(() => {
  cleanup()
})

const openInfoPanel = async () => {
  await waitFor(() => expect(screen.getByText("Test Group")).toBeInTheDocument())
  fireEvent.click(screen.getByText("Test Group"))
}

const renderChat = (props?: Partial<React.ComponentProps<typeof ChatScreen>>) =>
  render(
    <ToastProvider>
      <ChatScreen conversationId="c1" onBack={vi.fn()} {...props} />
    </ToastProvider>,
  )

describe("ChatScreen mute", () => {
  it("loads the muted state from the conversation detail", async () => {
    defaultMock(true)
    renderChat()
    await openInfoPanel()
    await waitFor(() => expect(screen.getByText("Unmute")).toBeInTheDocument())
  })

  it("mutes the conversation via the server", async () => {
    renderChat()
    await openInfoPanel()
    fireEvent.click(await screen.findByText("Mute"))
    await waitFor(() => expect(mockApi).toHaveBeenCalledWith("/api/conversations/c1/mute", { method: "PUT" }))
    expect(screen.getByText("Unmute")).toBeInTheDocument()
  })

  it("unmutes the conversation via the server", async () => {
    renderChat()
    await openInfoPanel()
    fireEvent.click(await screen.findByText("Mute"))
    await waitFor(() => expect(screen.getByText("Unmute")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Unmute"))
    await waitFor(() => expect(mockApi).toHaveBeenCalledWith("/api/conversations/c1/mute", { method: "DELETE" }))
  })
})

describe("ChatScreen attachments", () => {
  it("sends attachments with a client message id so the echo does not duplicate it", async () => {
    const { launchImageLibraryAsync } = await import("expo-image-picker")
    vi.mocked(launchImageLibraryAsync).mockImplementation(() =>
      Promise.resolve({
        canceled: false,
        assets: [{ uri: "file:///a.jpg", fileName: "a.jpg", mimeType: "image/jpeg" }],
      }),
    )
    renderChat()
    await waitFor(() => expect(screen.getByText("Test Group")).toBeInTheDocument())
    fireEvent.click(screen.getByTestId("attachImage"))
    await waitFor(() => expect(mockApiFormData).toHaveBeenCalled())
    await waitFor(() =>
      expect(wsSend).toHaveBeenCalledWith(
        "message:send",
        expect.objectContaining({
          clientMessageId: expect.stringMatching(/^temp_/),
          messageType: "image",
          attachment: { url: "/uploads/x.png", filename: "x.png", mimeType: "image/png", size: 100 },
        }),
      ),
    )
  })

  it("does not duplicate a message echoed by the server", async () => {
    mockApi.mockImplementation((path: string) => {
      if (path === "/api/conversations/c1") return Promise.resolve(convInfo(false))
      if (path === "/api/conversations/c1/messages")
        return Promise.resolve([
          {
            id: "m1",
            content: "hello",
            senderId: "other",
            createdAt: new Date().toISOString(),
            sender: { id: "other", username: "Other" },
          },
        ])
      return Promise.resolve([])
    })
    renderChat()
    await waitFor(() => expect(screen.getAllByText("hello").length).toBe(1))
    wsHandlers["message:new"]?.forEach((fn) =>
      fn({
        type: "message:new",
        id: "m1",
        senderId: "other",
        conversationId: "c1",
        content: "hello",
        createdAt: new Date().toISOString(),
      }),
    )
    await waitFor(() => expect(screen.getAllByText("hello").length).toBe(1))
  })

  it("resolves relative upload urls for image previews", async () => {
    mockApi.mockImplementation((path: string) => {
      if (path === "/api/conversations/c1") return Promise.resolve(convInfo(false))
      if (path === "/api/conversations/c1/messages")
        return Promise.resolve([
          {
            id: "m2",
            content: "/uploads/x.png",
            senderId: "other",
            createdAt: new Date().toISOString(),
            sender: { id: "other", username: "Other" },
            messageType: "image",
            fileUrl: "/uploads/x.png",
            fileName: "x.png",
            fileType: "image/png",
          },
        ])
      return Promise.resolve([])
    })
    renderChat()
    const img = await screen.findByRole("img")
    await waitFor(() => expect(img).toHaveAttribute("src", "http://localhost:3000/uploads/x.png"))
  })
})
