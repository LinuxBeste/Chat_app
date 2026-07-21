import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ChatWindow } from "./chat-window"

const mockUseAuth = vi.fn(() => ({ user: { id: "user-1", username: "testuser", email: "test@test.com" } }))

vi.mock("../../lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("./conversation-list", () => ({
  ConversationList: vi.fn(({ activeId, onSelect }) => (
    <div data-testid="conversation-list">
      <span data-testid="active-id">{activeId ?? "null"}</span>
      <button data-testid="select-conv" onClick={() => onSelect("conv-1")}>
        Select
      </button>
    </div>
  )),
}))

vi.mock("./chat-area", () => ({
  ChatArea: vi.fn(({ conversationId, currentUserId }) => (
    <div data-testid="chat-area">
      <span data-testid="conv-id">{conversationId}</span>
      <span data-testid="current-user">{currentUserId}</span>
    </div>
  )),
}))

describe("ChatWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: "user-1", username: "testuser", email: "test@test.com" } })
  })

  it("renders the chat window container", () => {
    render(<ChatWindow />)
    expect(screen.getByTestId("conversation-list")).toBeInTheDocument()
  })

  it("shows 'Select a conversation' when no conversation is active", () => {
    render(<ChatWindow />)
    expect(screen.getByText("Select a conversation")).toBeInTheDocument()
  })

  it("renders ChatArea when a conversation is selected", async () => {
    render(<ChatWindow />)
    await act(async () => {
      screen.getByTestId("select-conv").click()
    })
    expect(screen.getByTestId("chat-area")).toBeInTheDocument()
  })

  it("passes conversationId to ChatArea on selection", async () => {
    render(<ChatWindow />)
    await act(async () => {
      screen.getByTestId("select-conv").click()
    })
    expect(screen.getByTestId("conv-id").textContent).toBe("conv-1")
  })

  it("passes currentUserId to ChatArea", async () => {
    render(<ChatWindow />)
    await act(async () => {
      screen.getByTestId("select-conv").click()
    })
    expect(screen.getByTestId("current-user").textContent).toBe("user-1")
  })

  it("hides the select placeholder when conversation is selected", async () => {
    render(<ChatWindow />)
    await act(async () => {
      screen.getByTestId("select-conv").click()
    })
    expect(screen.queryByText("Select a conversation")).not.toBeInTheDocument()
  })

  it("passes null activeId to ConversationList initially", () => {
    render(<ChatWindow />)
    expect(screen.getByTestId("active-id").textContent).toBe("null")
  })

  it("does not render ChatArea without a user", () => {
    mockUseAuth.mockReturnValue({ user: null as any })
    render(<ChatWindow />)
    expect(screen.queryByTestId("chat-area")).not.toBeInTheDocument()
  })

  it("renders conversation list with border class", () => {
    const { container } = render(<ChatWindow />)
    expect(container.querySelector(".border-r")).toBeInTheDocument()
  })

  it("does not crash when onSelect is called", async () => {
    render(<ChatWindow />)
    await act(async () => {
      screen.getByTestId("select-conv").click()
    })
  })
})
