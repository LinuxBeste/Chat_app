import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("renders first letter of name", () => {
    render(<Avatar name="John" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders first letter when name has multiple words", () => {
    render(<Avatar name="john doe" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders question mark when no name provided", () => {
    render(<Avatar />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies custom size", () => {
    render(<Avatar name="A" size={64} />);
    expect(screen.getByText("A").parentElement).toBeInTheDocument();
  });

  it("uppercases the initial", () => {
    render(<Avatar name="alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
