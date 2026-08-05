import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusSelector } from "./status-selector";

const mockApi = vi.fn();

vi.mock("../lib/api", () => ({
  api: (...args: any[]) => mockApi(...args),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(),
  BASE_URL: "http://localhost:3000",
}));

vi.mock("../lib/ws", () => ({
  wsClient: { send: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
}));

describe("StatusSelector", () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockResolvedValue({});
  });

  it("renders current status in trigger", () => {
    render(<StatusSelector />);
    expect(screen.getByText("Online", { exact: false })).toBeInTheDocument();
  });

  it("shows status options when trigger is pressed", () => {
    render(<StatusSelector />);
    fireEvent.click(screen.getByText("Online", { exact: false }).closest("button")!);
    expect(screen.getByText("Away", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Busy", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Offline", { exact: false })).toBeInTheDocument();
  });

  it("renders custom status input when modal is open", () => {
    render(<StatusSelector />);
    fireEvent.click(screen.getByText("Online", { exact: false }).closest("button")!);
    expect(screen.getByPlaceholderText("Set custom status...")).toBeInTheDocument();
  });
});
