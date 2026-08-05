import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./card";
import { Text } from "react-native";

describe("Card", () => {
  it("renders children", () => {
    render(
      <Card>
        <Text testID="child">Content</Text>
      </Card>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders multiple children", () => {
    render(
      <Card>
        <Text>First</Text>
        <Text>Second</Text>
      </Card>,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
