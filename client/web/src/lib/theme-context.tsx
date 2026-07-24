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

export const defaultLightTheme: ThemeConfig = {
  colors: {
    "bg-primary": "#FAF9F6",
    "bg-secondary": "#FFFFFF",
    surface: "#FFFFFF",
    border: "#E4E2DD",
    accent: "#E8574A",
    "accent-hover": "#D64B3F",
    "text-primary": "#1C1917",
    "text-secondary": "#78716C",
    "text-muted": "#A8A29E",
  },
  bubbleStyle: "cozy",
  borderRadius: 24,
  statusEmoji: "",
}

export const defaultDarkTheme: ThemeConfig = {
  colors: {
    "bg-primary": "#0A0A0F",
    "bg-secondary": "#101016",
    surface: "#181825",
    border: "#252538",
    accent: "#6C8CFF",
    "accent-hover": "#7FA0FF",
    "text-primary": "#E8E8F0",
    "text-secondary": "#8888A0",
    "text-muted": "#585870",
  },
  bubbleStyle: "compact",
  borderRadius: 16,
  statusEmoji: "",
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
  lightTheme: ThemeConfig | null
  darkTheme: ThemeConfig | null
  setLightTheme: (config: ThemeConfig | null) => void
  setDarkTheme: (config: ThemeConfig | null) => void
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
  const [lightTheme, setLightThemeState] = useState<ThemeConfig | null>(() => {
    const stored = localStorage.getItem("lightTheme")
    return stored ? JSON.parse(stored) : null
  })
  const [darkTheme, setDarkThemeState] = useState<ThemeConfig | null>(() => {
    const stored = localStorage.getItem("darkTheme")
    return stored ? JSON.parse(stored) : null
  })

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
      setLightThemeState(null)
      setDarkThemeState(null)
      localStorage.setItem("customThemeId", t.id)
      localStorage.setItem("customTheme", t.theme)
      localStorage.removeItem("lightTheme")
      localStorage.removeItem("darkTheme")
    },
    [],
  )

  const setLightTheme = useCallback((config: ThemeConfig | null) => {
    setLightThemeState(config)
    if (config) {
      localStorage.setItem("lightTheme", JSON.stringify(config))
    } else {
      localStorage.removeItem("lightTheme")
    }
  }, [])

  const setDarkTheme = useCallback((config: ThemeConfig | null) => {
    setDarkThemeState(config)
    if (config) {
      localStorage.setItem("darkTheme", JSON.stringify(config))
    } else {
      localStorage.removeItem("darkTheme")
    }
  }, [])

  const clearCustomTheme = useCallback(() => {
    setCustomTheme(null)
    setThemeConfig(null)
    setLightThemeState(null)
    setDarkThemeState(null)
    localStorage.removeItem("customThemeId")
    localStorage.removeItem("customTheme")
    localStorage.removeItem("lightTheme")
    localStorage.removeItem("darkTheme")
  }, [])

  const refreshCustomTheme = useCallback(async () => {
    if (!getTokens().accessToken) return
    try {
      const active = await api<CustomThemeData | null>("/api/themes/active")
      if (active) {
        applyTheme(active)
      }
    } catch { /* offline */ }
  }, [])

  const applyPreset = useCallback(
    (preset: ThemeConfig) => {
      setCustomTheme(null)
      setLightThemeState(preset)
      setDarkThemeState(preset)
      localStorage.removeItem("customThemeId")
      localStorage.removeItem("customTheme")
      localStorage.setItem("lightTheme", JSON.stringify(preset))
      localStorage.setItem("darkTheme", JSON.stringify(preset))
    },
    [],
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  useEffect(() => {
    if (customTheme) {
      applyCssVars(JSON.parse(customTheme.theme))
    } else if (theme === "dark") {
      applyCssVars(darkTheme ?? defaultDarkTheme)
    } else {
      applyCssVars(lightTheme ?? defaultLightTheme)
    }
  }, [theme, customTheme, darkTheme, lightTheme, applyCssVars])

  useEffect(() => {
    refreshCustomTheme()
  }, [refreshCustomTheme])

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme, toggleTheme, customTheme, themeConfig,
        lightTheme, darkTheme,
        setLightTheme, setDarkTheme,
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
