import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("passes value and onChangeText", () => {
    const onChange = vi.fn();
    render(<Input value="hello" onChangeText={onChange} />);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
  });

  it("forwards other TextInput props", () => {
    render(<Input secureTextEntry testID="pw-input" />);
    expect(screen.getByTestId("pw-input")).toBeInTheDocument();
  });
});
