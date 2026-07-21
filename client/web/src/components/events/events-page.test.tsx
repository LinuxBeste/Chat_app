import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EventsPage } from "./events-page"

const now = new Date()
const futureDate = new Date(now.getTime() + 86400000).toISOString()
const pastDate = new Date(now.getTime() - 86400000).toISOString()

const mockEvents = [
  {
    id: "event-1",
    conversationId: "conv-1",
    createdBy: "user-1",
    title: "Team Standup",
    description: "Daily standup meeting",
    startsAt: futureDate,
    endsAt: new Date(now.getTime() + 90000000).toISOString(),
    createdAt: now.toISOString(),
    rsvps: [{ userId: "user-1", status: "going" }],
  },
  {
    id: "event-2",
    conversationId: "conv-1",
    createdBy: "user-2",
    title: "Past Event",
    description: null,
    startsAt: pastDate,
    endsAt: null,
    createdAt: now.toISOString(),
    rsvps: [],
  },
]

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}))

import { api } from "../../lib/api"

describe("EventsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api).mockResolvedValue(mockEvents)
  })

  it("renders the Events heading", async () => {
    render(<EventsPage />)
    expect(screen.getByText("Events")).toBeInTheDocument()
  })

  it("shows upcoming events", async () => {
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText("Team Standup")).toBeInTheDocument()
    })
    expect(screen.getByText("Upcoming")).toBeInTheDocument()
  })

  it("shows past events", async () => {
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText("Past Event")).toBeInTheDocument()
    })
    expect(screen.getByText("Past")).toBeInTheDocument()
  })

  it("shows 'Select an event or create one' initially", async () => {
    render(<EventsPage />)
    expect(screen.getByText("Select an event or create one")).toBeInTheDocument()
  })

  it("opens create event dialog on button click", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValue([])
    render(<EventsPage />)
    await user.click(screen.getByLabelText("Create event"))
    expect(screen.getByText("Create Event")).toBeInTheDocument()
  })

  it("shows RSVP section when event is selected", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValueOnce(mockEvents)
    vi.mocked(api).mockResolvedValueOnce(mockEvents[0])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText("Team Standup")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Team Standup"))
    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeInTheDocument()
    })
  })
})
