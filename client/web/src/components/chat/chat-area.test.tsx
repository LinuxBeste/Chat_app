import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatArea } from "./chat-area"

const mockConvInfo = {
  id: "conv-1",
  type: "dm",
  name: null,
  createdAt: "2024-01-01T00:00:00Z",
  members: [
    { id: "user-1", username: "testuser", displayName: null, role: "owner" },
    { id: "other-1", username: "Alice", displayName: "Alice Smith", role: "member" },
  ],
}

const mockMessages = [
  {
    id: "msg-1",
    content: "Hello!",
    type: "text",
    senderId: "other-1",
    createdAt: "2024-01-01T12:00:00Z",
    sender: { username: "Alice", displayName: "Alice Smith", avatar: null },
  },
  {
    id: "msg-2",
    content: "Hey there!",
    type: "text",
    senderId: "user-1",
    createdAt: "2024-01-01T12:01:00Z",
    sender: { username: "testuser", displayName: null, avatar: null },
  },
]

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
}))

let apiCallIndex = 0
vi.mock("../../lib/api", () => ({
  api: vi.fn(() => {
    const i = apiCallIndex++
    return Promise.resolve(i === 0 ? mockMessages : mockConvInfo)
  }),
}))

vi.mock("../../lib/ws", () => ({
  wsClient: {
    send: vi.fn(),
    on: vi.fn(() => vi.fn()),
    isConnected: vi.fn(() => true),
  },
}))

vi.mock("../../lib/toast-context", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}))

vi.mock("./message-input", () => ({
  MessageInput: vi.fn(({ onSend }) => (
    <div data-testid="message-input">
      <button data-testid="send-btn" onClick={() => onSend("New message")}>
        Send
      </button>
    </div>
  )),
}))

vi.mock("./call-overlay", () => ({
  CallOverlay: vi.fn(() => <div data-testid="call-overlay" />),
}))

vi.mock("../ui/avatar", () => ({
  Avatar: vi.fn(({ fallback }) => <div data-testid="avatar">{fallback}</div>),
}))

import { wsClient } from "../../lib/ws"

describe("ChatArea", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiCallIndex = 0
  })

  it("shows loading state initially", () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    expect(screen.getByText("common.loading")).toBeInTheDocument()
  })

  it("displays messages from the API", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument()
    })
    expect(screen.getByText("Hey there!")).toBeInTheDocument()
  })

  it("shows sender name for messages from others", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })
  })

  it("shows chat header with other sender username", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Alice/i })).toBeInTheDocument()
    })
  })

  it("sends a new message via wsClient", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByTestId("send-btn")).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId("send-btn"))
    expect(wsClient.send).toHaveBeenCalledWith("message:send", expect.objectContaining({
      conversationId: "conv-1",
      content: "New message",
    }))
  })
})
