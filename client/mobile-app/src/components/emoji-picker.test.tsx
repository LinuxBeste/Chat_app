import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmojiPicker } from "./emoji-picker";

describe("EmojiPicker", () => {
  it("renders when visible", () => {
    render(<EmojiPicker visible onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search emoji...")).toBeInTheDocument();
  });

  it("does not render when not visible", () => {
    const { container } = render(<EmojiPicker visible={false} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(container.children.length).toBe(0);
  });

  it("calls onSelect and onClose when an emoji is tapped", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<EmojiPicker visible onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getAllByText("😀")[1].closest("button")!);

    expect(onSelect).toHaveBeenCalledWith("😀");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when overlay is pressed", () => {
    const onClose = vi.fn();
    render(<EmojiPicker visible onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByPlaceholderText("Search emoji...").closest("button")!);

    expect(onClose).toHaveBeenCalled();
  });

  it("renders emoji grid with categories", () => {
    render(<EmojiPicker visible onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByText("😀")[1]).toBeInTheDocument();
    expect(screen.getByText("👋")).toBeInTheDocument();
  });

  it("shows search input", () => {
    render(<EmojiPicker visible onSelect={vi.fn()} onClose={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText("Search emoji...");
    expect(searchInput).toBeInTheDocument();
  });
});
