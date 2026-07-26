import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { NavProvider, useNav } from "./nav-context"
import type { ReactNode } from "react"

function wrapper({ children }: { children: ReactNode }) {
  return <NavProvider>{children}</NavProvider>
}

describe("NavProvider / useNav", () => {
  it("defaults to chats view and null conversation", () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    expect(result.current.view).toBe("chats")
    expect(result.current.activeConversationId).toBeNull()
  })

  it("setView changes the current view", () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    act(() => result.current.setView("settings"))
    expect(result.current.view).toBe("settings")
  })

  it("setActiveConversationId updates the conversation", () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    act(() => result.current.setActiveConversationId("conv-1"))
    expect(result.current.activeConversationId).toBe("conv-1")
  })

  it("setActiveConversationId can clear the conversation", () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    act(() => result.current.setActiveConversationId("conv-1"))
    act(() => result.current.setActiveConversationId(null))
    expect(result.current.activeConversationId).toBeNull()
  })

  it("provides fallback defaults when no provider", () => {
    const { result } = renderHook(() => useNav())
    expect(result.current.view).toBe("chats")
    expect(result.current.activeConversationId).toBeNull()
    expect(() => result.current.setView("admin")).not.toThrow()
  })
})
