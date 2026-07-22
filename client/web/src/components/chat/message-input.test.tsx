import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MessageInput } from "./message-input"

vi.mock("react-i18next", async () => {
  const en = await import("../../lib/i18n/locales/en.json")
  return {
    useTranslation: () => ({
      t: (k: string) => {
        const parts = k.split(".")
        let obj: any = en
        for (const p of parts) { obj = obj?.[p]; if (obj === undefined) return k }
        return typeof obj === "string" ? obj : k
      },
      i18n: { changeLanguage: vi.fn(), language: "en" },
    }),
  }
})

describe("MessageInput", () => {
  const onSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the input field", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument()
  })

  it("renders the send button", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    expect(screen.getByLabelText("Send message")).toBeInTheDocument()
  })

  it("send button is disabled when input is empty", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    expect(screen.getByLabelText("Send message")).toBeDisabled()
  })

  it("send button is enabled when input has text", async () => {
    const user = userEvent.setup()
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    const input = screen.getByPlaceholderText("Type a message...")
    await user.type(input, "Hello")
    expect(screen.getByLabelText("Send message")).toBeEnabled()
  })

  it("calls onSend with trimmed content on submit", async () => {
    const user = userEvent.setup()
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    const input = screen.getByPlaceholderText("Type a message...")
    await user.type(input, "Hello world")
    await user.click(screen.getByLabelText("Send message"))
    expect(onSend).toHaveBeenCalledWith("Hello world")
  })

  it("renders the emoji button", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    expect(screen.getByLabelText("Insert emoji")).toBeInTheDocument()
  })

  it("renders the attach file button", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    expect(screen.getByLabelText("Attach file")).toBeInTheDocument()
  })

  it("clears input after sending", async () => {
    const user = userEvent.setup()
    render(<MessageInput conversationId="conv-1" onSend={onSend} />)
    const input = screen.getByPlaceholderText("Type a message...") as HTMLInputElement
    await user.type(input, "Hello")
    await user.click(screen.getByLabelText("Send message"))
    expect(input.value).toBe("")
  })
})
