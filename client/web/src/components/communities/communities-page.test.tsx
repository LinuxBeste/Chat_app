import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunitiesPage } from "./communities-page";

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

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1", username: "test" } })),
}));

const mockCommunities = [
  {
    id: "comm-1",
    name: "React Developers",
    description: "A community for React devs",
    createdAt: "2024-01-01T00:00:00Z",
  },
  { id: "comm-2", name: "Designers", description: null, createdAt: "2024-01-02T00:00:00Z" },
];

const mockCommunityDetail = {
  id: "comm-1",
  name: "React Developers",
  description: "A community for React devs",
  createdAt: "2024-01-01T00:00:00Z",
  channels: [
    { id: "ch-1", communityId: "comm-1", name: "general", topic: "General discussion" },
    { id: "ch-2", communityId: "comm-1", name: "random", topic: null },
  ],
  members: [
    { userId: "u1", communityId: "comm-1", role: "admin" },
    { userId: "u2", communityId: "comm-1", role: "member" },
  ],
};

const mockInvites = [{ id: "inv-1", communityId: "comm-1", code: "ABC123", useCount: 2, maxUses: 10, expiresAt: null }];

vi.mock("../../lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "../../lib/api";

describe("CommunitiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Communities heading", async () => {
    vi.mocked(api).mockResolvedValue(mockCommunities);
    render(<CommunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Communities")).toBeInTheDocument();
    });
  });

  it("lists communities from the API", async () => {
    vi.mocked(api).mockResolvedValue(mockCommunities);
    render(<CommunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText("React Developers")).toBeInTheDocument();
    });
    expect(screen.getByText("Designers")).toBeInTheDocument();
  });

  it("opens create dialog on button click", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValue([]);
    render(<CommunitiesPage />);
    await user.click(screen.getByLabelText("Create community"));
    expect(screen.getByText("Create Community")).toBeInTheDocument();
  });

  it("opens join dialog on button click", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValue([]);
    render(<CommunitiesPage />);
    await user.click(screen.getByLabelText("Join community"));
    expect(screen.getByText("Join Community")).toBeInTheDocument();
  });

  it("shows channels when community is selected", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValueOnce(mockCommunities);
    vi.mocked(api).mockResolvedValueOnce(mockCommunityDetail);
    vi.mocked(api).mockResolvedValueOnce(mockInvites);
    render(<CommunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText("React Developers")).toBeInTheDocument();
    });
    await user.click(screen.getByText("React Developers"));
    await waitFor(() => {
      expect(screen.getByText("general")).toBeInTheDocument();
    });
    expect(screen.getByText("random")).toBeInTheDocument();
  });

  it("shows members when community is selected", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValueOnce(mockCommunities);
    vi.mocked(api).mockResolvedValueOnce(mockCommunityDetail);
    vi.mocked(api).mockResolvedValueOnce(mockInvites);
    render(<CommunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText("React Developers")).toBeInTheDocument();
    });
    await user.click(screen.getByText("React Developers"));
    await waitFor(() => {
      expect(screen.getByText(/admin/)).toBeInTheDocument();
    });
    expect(screen.getByText(/member/)).toBeInTheDocument();
  });
});
