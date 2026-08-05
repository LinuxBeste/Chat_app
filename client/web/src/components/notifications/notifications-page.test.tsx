import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationsPage } from "./notifications-page";

vi.mock("lucide-react", () => ({
  Bell: () => <div data-testid="icon-bell" />,
  CheckCheck: () => <div data-testid="icon-check" />,
  MessageSquare: () => <div data-testid="icon-message" />,
  Users: () => <div data-testid="icon-users" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  Globe: () => <div data-testid="icon-globe" />,
}));

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("../../lib/notification-context", () => ({
  useNotificationCount: vi.fn(() => ({ unreadCount: 2, refresh: vi.fn() })),
}));

import { api } from "../../lib/api";

const createMockNotif = (overrides = {}) => ({
  id: "notif-1",
  type: "message",
  title: "New message from Alice",
  body: "Hello there!",
  isRead: "false",
  createdAt: new Date(Date.now() - 60000).toISOString(),
  ...overrides,
});

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Notifications heading", async () => {
    vi.mocked(api).mockResolvedValue([createMockNotif()]);
    render(<NotificationsPage />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows unread notifications", async () => {
    vi.mocked(api).mockResolvedValue([createMockNotif()]);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("New message from Alice")).toBeInTheDocument();
    });
  });

  it("shows read notifications in the Earlier section", async () => {
    vi.mocked(api).mockResolvedValue([createMockNotif({ isRead: "true", title: "Meeting tomorrow", id: "notif-3" })]);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Meeting tomorrow")).toBeInTheDocument();
    });
    expect(screen.getByText("Earlier")).toBeInTheDocument();
  });

  it("shows Unread section heading", async () => {
    vi.mocked(api).mockResolvedValue([createMockNotif()]);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Unread")).toBeInTheDocument();
    });
  });

  it("marks a notification as read on click", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValueOnce([createMockNotif()]);
    vi.mocked(api).mockResolvedValueOnce(undefined);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("New message from Alice")).toBeInTheDocument();
    });
    await user.click(screen.getByText("New message from Alice"));
    expect(api).toHaveBeenCalledWith("/api/notifications/notif-1/read", { method: "POST" });
  });

  it("shows 'Mark all read' button when unread exist", async () => {
    vi.mocked(api).mockResolvedValue([createMockNotif()]);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });
  });

  it("shows empty state when no notifications", async () => {
    vi.mocked(api).mockResolvedValue([]);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    });
  });
});
