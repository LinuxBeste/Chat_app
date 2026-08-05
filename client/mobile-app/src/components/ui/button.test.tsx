import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders title text", () => {
    render(<Button title="Click me" onPress={() => {}} />);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onPress when pressed", () => {
    const onPress = vi.fn();
    render(<Button title="Press" onPress={onPress} />);
    fireEvent.click(screen.getByText("Press").parentElement!);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("does not call onPress when disabled", () => {
    const onPress = vi.fn();
    render(<Button title="Press" onPress={onPress} disabled />);
    fireEvent.click(screen.getByText("Press").parentElement!);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders primary variant by default", () => {
    render(<Button title="Primary" onPress={() => {}} />);
    expect(screen.getByText("Primary")).toBeInTheDocument();
  });

  it("renders secondary variant", () => {
    render(<Button title="Secondary" onPress={() => {}} variant="secondary" />);
    expect(screen.getByText("Secondary")).toBeInTheDocument();
  });

  it("renders danger variant", () => {
    render(<Button title="Danger" onPress={() => {}} variant="danger" />);
    expect(screen.getByText("Danger")).toBeInTheDocument();
  });
});
