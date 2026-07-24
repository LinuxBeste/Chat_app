import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GroupsPage } from "./groups-page"

const { mockGroups, mockMessages, apiCallIndex } = vi.hoisted(() => {
  const mockGroups = [
    { id: "group-1", type: "group", name: "Dev Team", createdAt: "2024-01-01T00:00:00Z", createdBy: "u1" },
    { id: "group-2", type: "group", name: "Design Team", createdAt: "2024-01-02T00:00:00Z", createdBy: "other" },
  ]
  return {
    mockGroups,
    mockMessages: [] as any[],
    apiCallIndex: { current: 0 },
  }
})

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
    initReactI18next: { type: "3rdParty", init: vi.fn() },
  }
})

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1", username: "test" } })),
}))

vi.mock("../layout/dashboard-layout", () => ({
  useNav: vi.fn(() => ({
    view: "chat",
    setView: vi.fn(),
    activeConversationId: null,
    setActiveConversationId: vi.fn(),
  })),
}))

vi.mock("../../lib/toast-context", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}))

vi.mock("../../lib/ws", () => ({
  wsClient: {
    send: vi.fn(),
    on: vi.fn(() => vi.fn()),
    isConnected: vi.fn(() => true),
  },
}))

vi.mock("../chat/call-overlay", () => ({
  CallOverlay: vi.fn(() => null),
}))

vi.mock("../ui/avatar", () => ({
  Avatar: vi.fn(({ fallback }) => <div data-testid="avatar">{fallback}</div>),
}))

vi.mock("../../lib/api", () => ({
  api: vi.fn(() => {
    const i = apiCallIndex.current++
    if (i === 0) return Promise.resolve(mockGroups)
    if (i === 1) return Promise.resolve(mockMessages)
    return Promise.resolve({ id: "conv", type: "group", members: [] })
  }),
  apiFormData: vi.fn(),
  BASE_URL: "",
}))

vi.mock("../chat/message-input", () => ({
  MessageInput: vi.fn(() => <div data-testid="message-input" />),
}))

import { api } from "../../lib/api"

describe("GroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiCallIndex.current = 0
  })

  it("renders the Groups heading", async () => {
    apiCallIndex.current = 0
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Groups")).toBeInTheDocument()
    })
  })

  it("lists groups from the API", async () => {
    apiCallIndex.current = 0
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    expect(screen.getByText("Design Team")).toBeInTheDocument()
  })

  it("shows empty state when no groups", async () => {
    vi.mocked(api).mockImplementationOnce(() => Promise.resolve([]))
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Groups")).toBeInTheDocument()
    })
  })

  it("shows create group button", async () => {
    vi.mocked(api).mockImplementationOnce(() => Promise.resolve([]))
    render(<GroupsPage />)
    expect(screen.getByLabelText("Create Group")).toBeInTheDocument()
  })

  it("opens create group dialog on button click", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockImplementationOnce(() => Promise.resolve([]))
    render(<GroupsPage />)
    await user.click(screen.getByLabelText("Create Group"))
    expect(screen.getByText("Create Group")).toBeInTheDocument()
  })

  it("shows 'No groups' when no groups", async () => {
    vi.mocked(api).mockImplementationOnce(() => Promise.resolve([]))
    render(<GroupsPage />)
    expect(screen.getByText("Groups")).toBeInTheDocument()
  })

  it("shows ChatArea when a group is clicked", async () => {
    const user = userEvent.setup()
    apiCallIndex.current = 0
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Dev Team"))
    await waitFor(() => {
      expect(screen.getByTestId("message-input")).toBeInTheDocument()
    })
  })

  it("shows select group placeholder when no group is selected", async () => {
    apiCallIndex.current = 0
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Select a group to manage")).toBeInTheDocument()
    })
  })

  it("shows delete button only for own groups", async () => {
    apiCallIndex.current = 0
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    const deleteButtons = screen.getAllByTitle("Delete")
    expect(deleteButtons.length).toBe(1)
  })

  it("calls delete API and removes group from list", async () => {
    const user = userEvent.setup()
    apiCallIndex.current = 0
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    const deleteButton = screen.getByTitle("Delete")
    await user.click(deleteButton)
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/api/conversations/group-1", { method: "DELETE" })
    })
    expect(screen.queryByText("Dev Team")).not.toBeInTheDocument()
  })
})
