import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { api } from "./api"

export interface CustomThemeData {
  id: string
  name: string
  theme: string
  isActive: string
}

export interface ThemeConfig {
  colors?: {
    "bg-primary"?: string
    "bg-secondary"?: string
    surface?: string
    border?: string
    accent?: string
    "accent-hover"?: string
    "text-primary"?: string
    "text-secondary"?: string
    "text-muted"?: string
  }
  bubbleStyle?: "compact" | "cozy" | "alternating"
  borderRadius?: number
  statusEmoji?: string
}

interface ThemeContextValue {
  theme: "light" | "dark"
  toggleTheme: () => void
  customTheme: CustomThemeData | null
  themeConfig: ThemeConfig | null
  applyTheme: (t: CustomThemeData) => void
  clearCustomTheme: () => void
  refreshCustomTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "light" || stored === "dark") return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })
  const [customTheme, setCustomTheme] = useState<CustomThemeData | null>(null)
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null)

  const applyCssVars = useCallback((tc: ThemeConfig | null) => {
    const root = document.documentElement
    if (tc?.colors) {
      for (const [key, val] of Object.entries(tc.colors)) {
        if (val) root.style.setProperty(`--${key}`, val)
      }
    } else {
      root.removeAttribute("style")
    }

    root.classList.remove("bubble-compact", "bubble-cozy", "bubble-alternating")
    if (tc?.bubbleStyle) {
      root.classList.add(`bubble-${tc.bubbleStyle}`)
    }

    if (tc?.borderRadius !== undefined) {
      root.style.setProperty("--bubble-radius", `${tc.borderRadius}px`)
    } else {
      root.style.removeProperty("--bubble-radius")
    }
  }, [])

  const applyTheme = useCallback(
    (t: CustomThemeData) => {
      setCustomTheme(t)
      const config: ThemeConfig = JSON.parse(t.theme)
      setThemeConfig(config)
      localStorage.setItem("customThemeId", t.id)
      localStorage.setItem("customTheme", t.theme)
      applyCssVars(config)
    },
    [applyCssVars],
  )

  const clearCustomTheme = useCallback(() => {
    setCustomTheme(null)
    setThemeConfig(null)
    localStorage.removeItem("customThemeId")
    localStorage.removeItem("customTheme")
    applyCssVars(null)
  }, [applyCssVars])

  const refreshCustomTheme = useCallback(async () => {
    try {
      const active = await api<CustomThemeData | null>("/api/themes/active")
      if (active) {
        applyTheme(active)
      } else {
        const stored = localStorage.getItem("customTheme")
        if (stored) {
          const config: ThemeConfig = JSON.parse(stored)
          setThemeConfig(config)
          applyCssVars(config)
        }
      }
    } catch {
      const stored = localStorage.getItem("customTheme")
      if (stored) {
        const config: ThemeConfig = JSON.parse(stored)
        setThemeConfig(config)
        applyCssVars(config)
      }
    }
  }, [applyTheme, applyCssVars])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  useEffect(() => {
    refreshCustomTheme()
  }, [refreshCustomTheme])

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, customTheme, themeConfig, applyTheme, clearCustomTheme, refreshCustomTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
