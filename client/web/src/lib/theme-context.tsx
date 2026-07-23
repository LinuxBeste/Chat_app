import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { api, getTokens } from "./api"

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

export const themePresets: { name: string; config: ThemeConfig }[] = [
  {
    name: "Midnight",
    config: {
      colors: {
        "bg-primary": "#0F1117",
        "bg-secondary": "#1A1D27",
        surface: "#232734",
        border: "#2E3345",
        accent: "#7C5CFC",
        "accent-hover": "#8B6DFC",
        "text-primary": "#E8EAF0",
        "text-secondary": "#949AAC",
        "text-muted": "#5C6278",
      },
      bubbleStyle: "cozy",
      borderRadius: 24,
      statusEmoji: "",
    },
  },
  {
    name: "Forest",
    config: {
      colors: {
        "bg-primary": "#0F1A12",
        "bg-secondary": "#1A2A1F",
        surface: "#243B2A",
        border: "#2E4D38",
        accent: "#4ADE80",
        "accent-hover": "#67E8A0",
        "text-primary": "#E8F0EA",
        "text-secondary": "#94A89C",
        "text-muted": "#5C7868",
      },
      bubbleStyle: "compact",
      borderRadius: 16,
      statusEmoji: "",
    },
  },
  {
    name: "Ocean",
    config: {
      colors: {
        "bg-primary": "#0F1A24",
        "bg-secondary": "#1A2A38",
        surface: "#243B4D",
        border: "#2E4D63",
        accent: "#60A5FA",
        "accent-hover": "#7DB8FC",
        "text-primary": "#E8F0F8",
        "text-secondary": "#94AAB8",
        "text-muted": "#5C7888",
      },
      bubbleStyle: "cozy",
      borderRadius: 20,
      statusEmoji: "",
    },
  },
  {
    name: "Sunset",
    config: {
      colors: {
        "bg-primary": "#1A1210",
        "bg-secondary": "#2A1E1A",
        surface: "#3B2A24",
        border: "#4D382E",
        accent: "#FB923C",
        "accent-hover": "#FCA85C",
        "text-primary": "#F0EAE8",
        "text-secondary": "#B8A894",
        "text-muted": "#88785C",
      },
      bubbleStyle: "cozy",
      borderRadius: 24,
      statusEmoji: "",
    },
  },
  {
    name: "Lavender",
    config: {
      colors: {
        "bg-primary": "#F8F6FC",
        "bg-secondary": "#FFFFFF",
        surface: "#FFFFFF",
        border: "#E8E4F0",
        accent: "#8B6CD6",
        "accent-hover": "#9B7CDE",
        "text-primary": "#2D2640",
        "text-secondary": "#7A7090",
        "text-muted": "#A89CB8",
      },
      bubbleStyle: "alternating",
      borderRadius: 20,
      statusEmoji: "",
    },
  },
]

interface ThemeContextValue {
  theme: "light" | "dark"
  toggleTheme: () => void
  customTheme: CustomThemeData | null
  themeConfig: ThemeConfig | null
  lightThemeId: string | null
  darkThemeId: string | null
  setLightTheme: (id: string | null) => void
  setDarkTheme: (id: string | null) => void
  applyTheme: (t: CustomThemeData) => void
  clearCustomTheme: () => void
  refreshCustomTheme: () => Promise<void>
  applyPreset: (preset: ThemeConfig) => void
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
  const [lightThemeId, setLightThemeId] = useState<string | null>(() => localStorage.getItem("lightThemeId"))
  const [darkThemeId, setDarkThemeId] = useState<string | null>(() => localStorage.getItem("darkThemeId"))

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
    if (!getTokens().accessToken) {
      const stored = localStorage.getItem("customTheme")
      if (stored) {
        const config: ThemeConfig = JSON.parse(stored)
        setThemeConfig(config)
        applyCssVars(config)
      }
      return
    }
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

  const applyPreset = useCallback(
    (preset: ThemeConfig) => {
      setThemeConfig(preset)
      localStorage.setItem("customTheme", JSON.stringify(preset))
      applyCssVars(preset)
    },
    [applyCssVars],
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem("lightThemeId", lightThemeId ?? "")
  }, [lightThemeId])

  useEffect(() => {
    localStorage.setItem("darkThemeId", darkThemeId ?? "")
  }, [darkThemeId])

  useEffect(() => {
    if (customTheme && theme === "dark") {
      const config: ThemeConfig = JSON.parse(customTheme.theme)
      applyCssVars(config)
    } else if (!customTheme && theme === "dark" && themeConfig) {
      applyCssVars(themeConfig)
    } else if (theme === "light") {
      applyCssVars(null)
    }
  }, [theme, customTheme, themeConfig, applyCssVars])

  useEffect(() => {
    refreshCustomTheme()
  }, [refreshCustomTheme])

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark"
      if (customTheme) {
        const config: ThemeConfig = JSON.parse(customTheme.theme)
        if (next === "light") {
          applyCssVars(null)
        } else {
          applyCssVars(config)
        }
      } else if (themeConfig) {
        if (next === "light") {
          applyCssVars(null)
        } else {
          applyCssVars(themeConfig)
        }
      }
      return next
    })
  }

  return (
    <ThemeContext.Provider
      value={{
        theme, toggleTheme, customTheme, themeConfig,
        lightThemeId, darkThemeId,
        setLightTheme: (id) => setLightThemeId(id),
        setDarkTheme: (id) => setDarkThemeId(id),
        applyTheme, clearCustomTheme, refreshCustomTheme, applyPreset,
      }}
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
