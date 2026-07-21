import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfilePage } from "./profile-page"

const mockUser = { id: "user-1", username: "testuser", email: "test@test.com", displayName: "Test User" }

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}))

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

import { api } from "../../lib/api"

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api).mockResolvedValue({ displayName: "Test User", bio: "Hello world" })
  })

  it("displays the profile heading", async () => {
    render(<ProfilePage />)
    expect(screen.getByText("Profile")).toBeInTheDocument()
  })

  it("shows user email from auth context", () => {
    render(<ProfilePage />)
    expect(screen.getByText("test@test.com")).toBeInTheDocument()
  })

  it("displays the display name input", async () => {
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument()
    })
  })

  it("displays the bio input", async () => {
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument()
    })
  })

  it("allows editing display name", async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument()
    })
    const input = screen.getByDisplayValue("Test User")
    await user.clear(input)
    await user.type(input, "New Name")
    expect(screen.getByDisplayValue("New Name")).toBeInTheDocument()
  })

  it("allows editing bio", async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument()
    })
    const textarea = screen.getByDisplayValue("Hello world")
    await user.clear(textarea)
    await user.type(textarea, "New bio")
    expect(screen.getByDisplayValue("New bio")).toBeInTheDocument()
  })

  it("saves changes on button click", async () => {
    const user = userEvent.setup()
    vi.mocked(api).mockResolvedValueOnce({ displayName: "Test User", bio: "Hello world" })
    vi.mocked(api).mockResolvedValueOnce(undefined)
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Save Changes"))
    expect(api).toHaveBeenCalledWith("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({ displayName: "Test User", bio: "Hello world" }),
    })
  })

  it("shows saving state when saving", async () => {
    vi.mocked(api).mockResolvedValueOnce({ displayName: "Test User", bio: "Hello world" })
    vi.mocked(api).mockImplementationOnce(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Save Changes"))
    expect(screen.getByText("Saving...")).toBeInTheDocument()
  })
})
