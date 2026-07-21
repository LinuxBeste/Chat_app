import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatArea } from "./chat-area"

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

vi.mock("../../lib/api", () => ({
  api: vi.fn(() => Promise.resolve(mockMessages)),
}))

vi.mock("../../lib/ws", () => ({
  wsClient: {
    on: vi.fn(() => vi.fn()),
    send: vi.fn(),
  },
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

import { api } from "../../lib/api"
import { wsClient } from "../../lib/ws"

describe("ChatArea", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading state initially", () => {
    vi.mocked(api).mockImplementationOnce(() => new Promise(() => {}))
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
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
      expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1)
    })
  })

  it("shows chat header with other sender username", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument()
    })
  })

  it("sends a new message via wsClient", async () => {
    const user = userEvent.setup()
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByTestId("send-btn")).toBeInTheDocument()
    })
    await user.click(screen.getByTestId("send-btn"))
    expect(wsClient.send).toHaveBeenCalledWith("message:send", { conversationId: "conv-1", content: "New message" })
  })

  it("subscribes to message:new websocket event", () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    expect(wsClient.on).toHaveBeenCalledWith("message:new", expect.any(Function))
  })

  it("subscribes to call:offer websocket event", () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    expect(wsClient.on).toHaveBeenCalledWith("call:offer", expect.any(Function))
  })

  it("displays the chat area with role log", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />)
    await waitFor(() => {
      expect(screen.getByRole("log")).toBeInTheDocument()
    })
  })
})
