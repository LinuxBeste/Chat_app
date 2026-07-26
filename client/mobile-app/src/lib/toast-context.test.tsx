import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, act, screen, fireEvent, renderHook } from "@testing-library/react"
import { ToastProvider, useToast } from "./toast-context"
import { Text, TouchableOpacity, View } from "react-native"

function TestConsumer() {
  const { showToast } = useToast()
  return (
    <View>
      <TouchableOpacity testID="show-error" onPress={() => showToast("Error occurred")}>
        <Text>Show Error</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="show-success" onPress={() => showToast("Saved!", "success")}>
        <Text>Show Success</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="show-info" onPress={() => showToast("Info message", "info")}>
        <Text>Show Info</Text>
      </TouchableOpacity>
    </View>
  )
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders children", () => {
    render(
      <ToastProvider>
        <Text testID="child">Hello</Text>
      </ToastProvider>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })

  it("shows error toast by default", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByTestId("show-error"))

    expect(screen.getByText("Error occurred")).toBeInTheDocument()
  })

  it("shows success toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByTestId("show-success"))

    expect(screen.getByText("Saved!")).toBeInTheDocument()
  })

  it("shows info toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByTestId("show-info"))

    expect(screen.getByText("Info message")).toBeInTheDocument()
  })

  it("removes toast after 4 seconds", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByTestId("show-error"))
    expect(screen.getByText("Error occurred")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText("Error occurred")).not.toBeInTheDocument()
  })

  it("dismisses toast on press", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByTestId("show-error"))
    const toast = screen.getByText("Error occurred")
    expect(toast).toBeInTheDocument()

    fireEvent.click(toast.parentElement!)
    expect(screen.queryByText("Error occurred")).not.toBeInTheDocument()
  })

  it("throws when useToast is used outside provider", () => {
    expect(() => renderHook(() => useToast())).toThrow("useToast must be used within ToastProvider")
  })
})
