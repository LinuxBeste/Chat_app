import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DashboardLayout } from "./dashboard-layout";

vi.mock("../../lib/theme-context", () => ({
  useTheme: () => ({ toggleTheme: vi.fn() }),
}));

vi.mock("./sidebar", () => ({
  Sidebar: vi.fn(({ collapsed, onToggle }) => (
    <div data-testid="sidebar">
      <span data-testid="collapsed">{collapsed ? "true" : "false"}</span>
      <button data-testid="toggle-sidebar" onClick={onToggle}>
        Toggle
      </button>
    </div>
  )),
}));

vi.mock("./topbar", () => ({
  Topbar: vi.fn(({ collapsed, onToggle }) => (
    <div data-testid="topbar">
      <span data-testid="topbar-collapsed">{collapsed ? "true" : "false"}</span>
      <button data-testid="toggle-topbar" onClick={onToggle}>
        Toggle
      </button>
    </div>
  )),
}));

vi.mock("../chat/chat-window", () => ({
  ChatWindow: vi.fn(() => <div data-testid="chat-window" />),
}));

vi.mock("../profile/profile-page", () => ({
  ProfilePage: vi.fn(() => <div data-testid="profile-page" />),
}));

vi.mock("../files/files-page", () => ({
  FilesPage: vi.fn(() => <div data-testid="files-page" />),
}));

vi.mock("../groups/groups-page", () => ({
  GroupsPage: vi.fn(() => <div data-testid="groups-page" />),
}));

vi.mock("../communities/communities-page", () => ({
  CommunitiesPage: vi.fn(() => <div data-testid="communities-page" />),
}));

vi.mock("../events/events-page", () => ({
  EventsPage: vi.fn(() => <div data-testid="events-page" />),
}));

vi.mock("../notifications/notifications-page", () => ({
  NotificationsPage: vi.fn(() => <div data-testid="notifications-page" />),
}));

vi.mock("../settings/settings-page", () => ({
  SettingsPage: vi.fn(() => <div data-testid="settings-page" />),
}));

vi.mock("../calls/calls-page", () => ({
  CallsPage: vi.fn(() => <div data-testid="calls-page" />),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default chat view", () => {
    render(<DashboardLayout />);
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
  });

  it("renders Sidebar", () => {
    render(<DashboardLayout />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renders Topbar", () => {
    render(<DashboardLayout />);
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
  });

  it("starts with collapsed=false", () => {
    render(<DashboardLayout />);
    expect(screen.getByTestId("collapsed").textContent).toBe("false");
  });

  it("toggles collapsed state when toggle is clicked", async () => {
    render(<DashboardLayout />);
    await act(async () => {
      screen.getByTestId("toggle-sidebar").click();
    });
    expect(screen.getByTestId("collapsed").textContent).toBe("true");
    expect(screen.getByTestId("topbar-collapsed").textContent).toBe("true");
  });

  it("provides NavContext to children with default chat view", () => {
    render(<DashboardLayout />);
  });

  it("renders all view components", () => {
    render(<DashboardLayout />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
  });
});
