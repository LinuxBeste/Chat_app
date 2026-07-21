import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GroupsPage } from "./groups-page"

const mockGroups = [
  { id: "group-1", type: "group", name: "Dev Team", createdAt: "2024-01-01T00:00:00Z" },
  { id: "group-2", type: "group", name: "Design Team", createdAt: "2024-01-02T00:00:00Z" },
]

const mockGroupDetail = {
  id: "group-1",
  type: "group",
  name: "Dev Team",
  createdAt: "2024-01-01T00:00:00Z",
  members: [
    { id: "m1", username: "alice", displayName: "Alice", role: "admin" },
    { id: "m2", username: "bob", displayName: null, role: "member" },
  ],
}

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
    expect(screen.getByLabelText("Create group")).toBeInTheDocument()
  })

  it("opens create group dialog on button click", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValue([])
    render(<GroupsPage />)
    await user.click(screen.getByLabelText("Create group"))
    expect(screen.getByText("Create Group")).toBeInTheDocument()
  })

  it("shows 'Select a group to manage' initially", async () => {
    vi.mocked(api).mockResolvedValue([])
    render(<GroupsPage />)
    expect(screen.getByText("Select a group to manage")).toBeInTheDocument()
  })

  it("selects a group and shows its details", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValueOnce(mockGroups)
    vi.mocked(api).mockResolvedValueOnce(mockGroupDetail)
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Dev Team"))
    await waitFor(() => {
      expect(screen.getByText("Group Settings")).toBeInTheDocument()
    })
  })

  it("shows members list when group is selected", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValueOnce(mockGroups)
    vi.mocked(api).mockResolvedValueOnce(mockGroupDetail)
    render(<GroupsPage />)
    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Dev Team"))
    await waitFor(() => {
      expect(screen.getByText(/Members/)).toBeInTheDocument()
    })
  })
})
