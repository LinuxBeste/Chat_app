import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CallsScreen } from "./calls-screen";
import { AuthProvider } from "../lib/auth-context";
import type { ReactNode } from "react";

vi.mock("../lib/api", () => ({
  api: vi.fn(() => Promise.resolve([])),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  getTokens: vi.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(),
  BASE_URL: "http://localhost:3000",
}));

vi.mock("../lib/ws", () => ({
  wsClient: { connect: vi.fn(), disconnect: vi.fn() },
}));

vi.mock("../lib/crypto", () => ({
  getOrCreateKeyPair: vi.fn(() => Promise.resolve({ publicKey: "pk", secretKey: "sk" })),
  deleteKeyPair: vi.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("CallsScreen", () => {
  it("renders the title", () => {
    render(<CallsScreen />, { wrapper });
    expect(screen.getByText("Calls")).toBeInTheDocument();
  });

  it("shows call history placeholder", () => {
    render(<CallsScreen />, { wrapper });
    expect(screen.getByText("No call history")).toBeInTheDocument();
  });
});
