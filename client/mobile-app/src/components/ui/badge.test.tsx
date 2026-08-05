import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders count when greater than 0", () => {
    render(<Badge count={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("returns null when count is 0", () => {
    const { container } = render(<Badge count={0} />);
    expect(container.children.length).toBe(0);
  });

  it("shows 99+ for counts over 99", () => {
    render(<Badge count={100} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("renders with md size", () => {
    render(<Badge count={3} size="md" />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
