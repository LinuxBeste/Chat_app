import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";

vi.mock("react-native", async () => {
  const actual = await vi.importActual("react-native");
  return {
    ...(actual as any),
    useColorScheme: vi.fn(() => "dark"),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("ThemeProvider / useTheme", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("defaults to dark mode", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.mode).toBe("dark");
    });
  });

  it("toggles between dark and light", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.mode).toBe("dark");
    });

    act(() => result.current.toggle());

    expect(result.current.mode).toBe("light");

    act(() => result.current.toggle());

    expect(result.current.mode).toBe("dark");
  });

  it("persists theme choice to AsyncStorage", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.mode).toBe("dark");
    });

    act(() => result.current.toggle());

    const stored = await AsyncStorage.getItem("@themeMode");
    expect(stored).toBe("light");
  });

  it("provides dark color tokens in dark mode", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.c.bg).toBe("#0A0A0F");
    });
  });

  it("provides light color tokens in light mode", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.mode).toBe("dark");
    });

    act(() => result.current.toggle());

    expect(result.current.c.bg).toBe("#F5F5F8");
  });
});
