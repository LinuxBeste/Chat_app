import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationList } from "./conversation-list";

const mockConversations = [
  {
    id: "conv-1",
    type: "dm",
    name: "Alice",
    avatar: null,
    createdAt: "2024-01-01T00:00:00Z",
    otherUser: { id: "user-1", username: "alice", displayName: "Alice", avatar: null, customStatus: "Busy coding" },
  },
  {
    id: "conv-2",
    type: "dm",
    name: "Bob",
    avatar: null,
    createdAt: "2024-01-02T00:00:00Z",
    otherUser: { id: "user-2", username: "bob", displayName: "Bob", avatar: null, customStatus: null },
  },
];

vi.mock("react-i18next", async () => {
  const en = await import("../../lib/i18n/locales/en.json");
  return {
    useTranslation: () => ({
      t: (k: string) => {
        const parts = k.split(".");
        let obj: any = en;
        for (const p of parts) {
          obj = obj?.[p];
          if (obj === undefined) return k;
        }
        return typeof obj === "string" ? obj : k;
      },
      i18n: { changeLanguage: vi.fn(), language: "en" },
    }),
  };
});

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("../../lib/toast-context", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

vi.mock("../ui/avatar", () => ({
  Avatar: vi.fn(({ fallback }) => <div data-testid="avatar">{fallback}</div>),
}));

import { api } from "../../lib/api";

describe("ConversationList", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api).mockResolvedValue(mockConversations);
  });

  it("renders the Conversations heading", async () => {
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    expect(screen.getByText("Conversations")).toBeInTheDocument();
  });

  it("lists conversations from the API", async () => {
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows total count", async () => {
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    await waitFor(() => {
      expect(screen.getByText("2 total")).toBeInTheDocument();
    });
  });

  it("calls onSelect when a conversation is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Alice"));
    expect(onSelect).toHaveBeenCalledWith("conv-1");
  });

  it("handles empty conversations list", async () => {
    vi.mocked(api).mockResolvedValue([]);
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    await waitFor(() => {
      expect(screen.getByText("0 total")).toBeInTheDocument();
    });
  });

  it("shows avatar with first letter of display name", async () => {
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    await waitFor(() => {
      const avatars = screen.getAllByTestId("avatar");
      expect(avatars[0].textContent).toBe("A");
    });
  });

  it("handles API error gracefully", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Network error"));
    render(<ConversationList activeId={null} onSelect={onSelect} />);
    await waitFor(() => {
      expect(screen.getByText("Conversations")).toBeInTheDocument();
    });
    expect(screen.getByText("0 total")).toBeInTheDocument();
  });
});
