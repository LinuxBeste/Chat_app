import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CallsPage } from "./calls-page";

const mockCalls = [
  {
    id: "call-1",
    callerId: "user-1",
    calleeId: "user-2",
    status: "ended",
    duration: 120,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "call-2",
    callerId: "user-2",
    calleeId: "user-1",
    status: "missed",
    duration: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "call-3",
    callerId: "user-1",
    calleeId: "user-3",
    status: "ended",
    duration: 300,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "../../lib/api";

describe("CallsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userId", "user-1");
  });

  it("renders the Recent Calls heading", async () => {
    vi.mocked(api).mockResolvedValue(mockCalls);
    render(<CallsPage />);
    expect(screen.getByText("Recent Calls")).toBeInTheDocument();
  });

  it("shows call history from the API", async () => {
    vi.mocked(api).mockResolvedValue(mockCalls);
    render(<CallsPage />);
    await waitFor(() => {
      expect(screen.getByText("Incoming")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Outgoing")).toHaveLength(2);
  });

  it("shows missed call indicator", async () => {
    vi.mocked(api).mockResolvedValue(mockCalls);
    render(<CallsPage />);
    await waitFor(() => {
      expect(screen.getByText("Missed")).toBeInTheDocument();
    });
  });

  it("shows empty state when no call history", async () => {
    vi.mocked(api).mockResolvedValue([]);
    render(<CallsPage />);
    await waitFor(() => {
      expect(screen.getByText("No call history")).toBeInTheDocument();
    });
  });
});
