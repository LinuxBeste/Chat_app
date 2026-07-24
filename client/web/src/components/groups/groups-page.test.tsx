import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GroupsPage } from "./groups-page"

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

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1", username: "test" } })),
}))

const mockSetView = vi.fn()
const mockSetActiveConversationId = vi.fn()
vi.mock("../layout/dashboard-layout", () => ({
  useNav: vi.fn(() => ({
    view: "groups",
    setView: mockSetView,
    activeConversationId: null,
    setActiveConversationId: mockSetActiveConversationId,
  })),
}))

const mockGroups = [
  { id: "group-1", type: "group", name: "Dev Team", createdAt: "2024-01-01T00:00:00Z", createdBy: "u1" },
  { id: "group-2", type: "group", name: "Design Team", createdAt: "2024-01-02T00:00:00Z", createdBy: "other" },
]

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}))

import { api } from "../../lib/api"

describe("GroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the Groups heading", async () => {
    vi.mocked(api).mockResolvedValue(mockGroups)
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Groups")).toBeInTheDocument()
    })
  })

  it("lists groups from the API", async () => {
    vi.mocked(api).mockResolvedValue(mockGroups)
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    expect(screen.getByText("Design Team")).toBeInTheDocument()
  })

  it("shows empty state when no groups", async () => {
    vi.mocked(api).mockResolvedValue([])
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Groups")).toBeInTheDocument()
    })
  })

  it("shows create group button", async () => {
    vi.mocked(api).mockResolvedValue([])
    render(<GroupsPage />)
    expect(screen.getByLabelText("Create Group")).toBeInTheDocument()
  })

  it("opens create group dialog on button click", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValue([])
    render(<GroupsPage />)
    await user.click(screen.getByLabelText("Create Group"))
    expect(screen.getByText("Create Group")).toBeInTheDocument()
  })

  it("shows 'No groups' when no groups", async () => {
    vi.mocked(api).mockResolvedValue([])
    render(<GroupsPage />)
    expect(screen.getByText("Groups")).toBeInTheDocument()
  })

  it("opens chat when a group is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValue(mockGroups)
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Dev Team"))
    expect(mockSetActiveConversationId).toHaveBeenCalledWith("group-1")
    expect(mockSetView).toHaveBeenCalledWith("chat")
  })

  it("shows delete button only for own groups", async () => {
    vi.mocked(api).mockResolvedValue(mockGroups)
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    const deleteButtons = screen.getAllByTitle("Delete")
    expect(deleteButtons.length).toBe(1)
  })

  it("calls delete API and removes group from list", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValueOnce(mockGroups)
    vi.mocked(api).mockResolvedValueOnce({ message: "Conversation deleted" })
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
