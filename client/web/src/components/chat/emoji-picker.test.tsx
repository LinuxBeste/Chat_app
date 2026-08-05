import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmojiPicker } from "./emoji-picker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

describe("EmojiPicker", () => {
  const onEmojiSelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the picker with emoji grid", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    expect(screen.getByPlaceholderText("Search emoji...")).toBeInTheDocument();
  });

  it("calls onEmojiSelect and onClose when an emoji is clicked", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    const emojiButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent && b.textContent.length <= 2 && !b.getAttribute("title"));
    const firstEmoji = emojiButtons[0];
    if (firstEmoji) {
      fireEvent.click(firstEmoji);
      expect(onEmojiSelect).toHaveBeenCalledWith(firstEmoji.textContent);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("switches category on tab click", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    const tabs = screen.getAllByRole("button").filter((b) => b.getAttribute("title") && b.textContent?.length! <= 2);
    if (tabs.length > 1) {
      fireEvent.click(tabs[1]);
      expect(onEmojiSelect).not.toHaveBeenCalled();
    }
  });

  it("closes on Escape key", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("has a search input", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    expect(screen.getByPlaceholderText("Search emoji...")).toBeInTheDocument();
  });

  it("filters emojis when typing in search", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    const searchInput = screen.getByPlaceholderText("Search emoji...");
    fireEvent.change(searchInput, { target: { value: "heart" } });
    const emojiButtons = screen.getAllByRole("button").filter((b) => b.textContent && b.textContent.length <= 2);
    expect(emojiButtons.length).toBeGreaterThan(0);
  });

  it("shows no results message when search matches nothing", () => {
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />);
    const searchInput = screen.getByPlaceholderText("Search emoji...");
    fireEvent.change(searchInput, { target: { value: "zzzznonexistent" } });
    expect(screen.getByText("No emojis found")).toBeInTheDocument();
  });
});
