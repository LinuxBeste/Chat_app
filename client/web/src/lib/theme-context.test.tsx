import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ThemeProvider, useTheme } from "./theme-context"

function TestComponent() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("toggles theme on button click", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )

    expect(screen.getByTestId("theme").textContent).toBe("light")
    fireEvent.click(screen.getByTestId("toggle"))
    expect(screen.getByTestId("theme").textContent).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)

    fireEvent.click(screen.getByTestId("toggle"))
    expect(screen.getByTestId("theme").textContent).toBe("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("persists theme to localStorage", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByTestId("toggle"))
    expect(localStorage.getItem("theme")).toBe("dark")
  })

  it("reads theme from localStorage on mount", () => {
    localStorage.setItem("theme", "dark")
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    expect(screen.getByTestId("theme").textContent).toBe("dark")
  })
})
