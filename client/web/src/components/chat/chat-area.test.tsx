import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatArea } from "./chat-area";

const mockSetActiveConversationId = vi.fn();
const mockSetView = vi.fn();

const mockConvInfo = {
  id: "conv-1",
  type: "dm",
  name: null,
  createdAt: "2024-01-01T00:00:00Z",
  members: [
    { id: "user-1", username: "testuser", displayName: null, role: "owner" },
    { id: "other-1", username: "Alice", displayName: "Alice Smith", role: "member" },
  ],
};

const mockMessages = [
  {
    id: "msg-1",
    content: "Hello!",
    type: "text",
    senderId: "other-1",
    createdAt: "2024-01-01T12:00:00Z",
    sender: { username: "Alice", displayName: "Alice Smith", avatar: null },
  },
  {
    id: "msg-2",
    content: "Hey there!",
    type: "text",
    senderId: "user-1",
    createdAt: "2024-01-01T12:01:00Z",
    sender: { username: "testuser", displayName: null, avatar: null },
  },
];

vi.mock("../../lib/toast-context", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

vi.mock("../layout/dashboard-layout", () => ({
  useNav: vi.fn(() => ({
    setActiveConversationId: mockSetActiveConversationId,
    setView: mockSetView,
  })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

let apiCallIndex = 0;
vi.mock("../../lib/api", () => ({
  api: vi.fn(() => {
    const i = apiCallIndex++;
    if (i === 0) return Promise.resolve(mockMessages);
    if (i === 1) return Promise.resolve(mockConvInfo);
    return Promise.resolve({ id: "dm-conv", type: "dm" });
  }),
  apiFormData: vi.fn(),
  BASE_URL: "",
  resolveAssetUrl: (url: string) => url,
}));

vi.mock("../../lib/ws", () => ({
  wsClient: {
    send: vi.fn(),
    on: vi.fn(() => vi.fn()),
    isConnected: vi.fn(() => true),
  },
}));

vi.mock("./message-input", () => ({
  MessageInput: vi.fn(({ onSend }) => (
    <div data-testid="message-input">
      <button data-testid="send-btn" onClick={() => onSend("New message")}>
        Send
      </button>
    </div>
  )),
}));

vi.mock("./call-overlay", () => ({
  CallOverlay: vi.fn(() => <div data-testid="call-overlay" />),
}));

vi.mock("../ui/avatar", () => ({
  Avatar: vi.fn(({ fallback }) => <div data-testid="avatar">{fallback}</div>),
}));

import { wsClient } from "../../lib/ws";
import { api } from "../../lib/api";

describe("ChatArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiCallIndex = 0;
  });

  it("shows loading state initially", () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("displays messages from the API", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    });
    expect(screen.getByText("Hey there!")).toBeInTheDocument();
  });

  it("shows sender name for messages from others", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  it("shows chat header with other sender username", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Alice/i })).toBeInTheDocument();
    });
  });

  it("sends a new message via wsClient", async () => {
    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("send-btn")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTestId("send-btn"));
    expect(wsClient.send).toHaveBeenCalledWith(
      "message:send",
      expect.objectContaining({
        conversationId: "conv-1",
        content: "New message",
      }),
    );
  });

  it("renders file messages with displayName stripping timestamp prefix", async () => {
    const fileMsg = {
      id: "msg-file",
      content: "/uploads/123456789-987654321-test.txt",
      type: "file",
      senderId: "other-1",
      createdAt: "2024-01-01T12:02:00Z",
      sender: { username: "Alice", displayName: "Alice Smith", avatar: null },
      attachment: {
        id: "att-1",
        url: "/uploads/123456789-987654321-test.txt",
        filename: "test.txt",
        mimeType: "text/plain",
        size: 100,
      },
    };
    const mockApi = (await import("../../lib/api")).api as any;
    mockApi.mockReset();
    mockApi.mockResolvedValueOnce([fileMsg, ...mockMessages]);
    mockApi.mockResolvedValueOnce(mockConvInfo);

    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });
  });

  it("renders image messages", async () => {
    const imgMsg = {
      id: "msg-img",
      content: "/uploads/img.jpg",
      type: "image",
      senderId: "other-1",
      createdAt: "2024-01-01T12:02:00Z",
      sender: { username: "Alice", displayName: "Alice Smith", avatar: null },
    };
    const mockApi = (await import("../../lib/api")).api as any;
    mockApi.mockReset();
    mockApi.mockResolvedValueOnce([imgMsg, ...mockMessages]);
    mockApi.mockResolvedValueOnce(mockConvInfo);

    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByAltText("chat.sharedImage")).toBeInTheDocument();
    });
  });

  it("navigates to DM when clicking on a group member in conv menu", async () => {
    const groupConvInfo = {
      ...mockConvInfo,
      type: "group",
      members: [
        { id: "user-1", username: "testuser", displayName: null, role: "owner", status: "online" },
        { id: "other-1", username: "Alice", displayName: "Alice Smith", role: "member", status: "online" },
      ],
    };
    vi.mocked(api).mockReset();
    vi.mocked(api).mockResolvedValueOnce(mockMessages);
    vi.mocked(api).mockResolvedValueOnce(groupConvInfo);
    vi.mocked(api).mockResolvedValueOnce({ id: "dm-conv", type: "dm" });

    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const moreBtn = screen.getByLabelText("chat.moreOptions");
    fireEvent.click(moreBtn);
    await waitFor(() => {
      expect(screen.getByText("chat.groupInfo")).toBeInTheDocument();
    });

    const memberEl = screen.getByText("Alice Smith", { selector: "p" });
    fireEvent.click(memberEl);
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: ["other-1"] }),
      });
    });
    expect(mockSetActiveConversationId).toHaveBeenCalledWith("dm-conv");
    expect(mockSetView).toHaveBeenCalledWith("chat");
  });

  it("opens file preview modal on file click", async () => {
    const fileMsg = {
      id: "msg-file2",
      content: "/uploads/123456789-987654321-doc.pdf",
      type: "file",
      senderId: "other-1",
      createdAt: "2024-01-01T12:02:00Z",
      sender: { username: "Alice", displayName: "Alice Smith", avatar: null },
      attachment: {
        id: "att-2",
        url: "/uploads/123456789-987654321-doc.pdf",
        filename: "doc.pdf",
        mimeType: "application/pdf",
        size: 500,
      },
    };
    const mockApi = (await import("../../lib/api")).api as any;
    mockApi.mockReset();
    mockApi.mockResolvedValueOnce([fileMsg, ...mockMessages]);
    mockApi.mockResolvedValueOnce(mockConvInfo);

    render(<ChatArea conversationId="conv-1" currentUserId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("doc.pdf"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "doc.pdf" })).toBeInTheDocument();
    });
  });
});
