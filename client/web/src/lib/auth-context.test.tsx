import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";

vi.mock("./api", () => ({
  api: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getTokens: vi.fn(() => ({ accessToken: null, refreshToken: null })),
  NetworkError: class NetworkError extends Error {},
}));

vi.mock("./ws", () => ({
  wsClient: { connect: vi.fn(), disconnect: vi.fn() },
}));

vi.mock("./utils", () => ({
  isDesktop: vi.fn(() => false),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

import { api, clearTokens, getTokens, NetworkError } from "./api";
import { wsClient } from "./ws";
import { isDesktop } from "./utils";

function TestComponent() {
  const { user, loading, offline, retry, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="user">{user ? user.username : "null"}</span>
      <span data-testid="offline">{offline ? "offline" : "online"}</span>
      <button data-testid="login" onClick={() => login("a@b.com", "pass")}>
        Login
      </button>
      <button data-testid="register" onClick={() => register("u", "a@b.com", "pass")}>
        Register
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
      <button data-testid="retry" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("starts with loading and no user", () => {
    renderWithProvider();
    expect(screen.getByTestId("loading").textContent).toBe("loaded");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("logs in and sets user", async () => {
    const mockUser = { id: "1", username: "testuser", email: "a@b.com" };
    vi.mocked(api).mockResolvedValueOnce({
      user: mockUser,
      accessToken: "at",
      refreshToken: "rt",
    });

    renderWithProvider();
    await act(async () => {
      screen.getByTestId("login").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("testuser");
    });
    expect(wsClient.connect).toHaveBeenCalled();
  });

  it("registers and sets user", async () => {
    const mockUser = { id: "1", username: "newuser", email: "a@b.com" };
    vi.mocked(api).mockResolvedValueOnce({
      user: mockUser,
      accessToken: "at",
      refreshToken: "rt",
    });

    renderWithProvider();
    await act(async () => {
      screen.getByTestId("register").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("newuser");
    });
  });

  it("logs out and clears user", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      user: { id: "1", username: "testuser", email: "a@b.com" },
      accessToken: "at",
      refreshToken: "rt",
    });

    renderWithProvider();
    await act(async () => {
      screen.getByTestId("login").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("testuser");
    });

    await act(async () => {
      screen.getByTestId("logout").click();
    });

    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("web: network failure keeps tokens and does not set offline", async () => {
    vi.mocked(getTokens).mockReturnValue({ accessToken: "at", refreshToken: "rt" });
    vi.mocked(api).mockRejectedValueOnce(new NetworkError());

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("loaded");
    });

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("offline").textContent).toBe("online");
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it("desktop: network failure without cached user shows offline state", async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(getTokens).mockReturnValue({ accessToken: "at", refreshToken: "rt" });
    vi.mocked(api).mockRejectedValueOnce(new NetworkError());

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("offline").textContent).toBe("offline");
    });

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it("desktop: network failure with cached user restores the session", async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(getTokens).mockReturnValue({ accessToken: "at", refreshToken: "rt" });
    localStorage.setItem("offline:current-user", JSON.stringify({ id: "1", username: "cached", email: "c@b.com" }));
    vi.mocked(api).mockRejectedValueOnce(new NetworkError());

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("cached");
    });

    expect(screen.getByTestId("offline").textContent).toBe("offline");
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it("desktop: retry recovers when connectivity returns", async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(getTokens).mockReturnValue({ accessToken: "at", refreshToken: "rt" });
    vi.mocked(api).mockRejectedValueOnce(new NetworkError());

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("offline").textContent).toBe("offline");
    });

    vi.mocked(api).mockResolvedValueOnce({ id: "1", username: "back", email: "b@b.com" });
    await act(async () => {
      screen.getByTestId("retry").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("back");
    });
    expect(screen.getByTestId("offline").textContent).toBe("online");
    expect(localStorage.getItem("offline:current-user")).toContain("back");
  });
});
