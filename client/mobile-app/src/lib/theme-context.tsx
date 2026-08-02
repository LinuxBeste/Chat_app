import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface ThemeColors {
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  borderLight: string
  text: string
  textSecondary: string
  textMuted: string
  accent: string
  accentLight: string
  success: string
  danger: string
  warning: string
  overlay: string
  sheetBg: string
  cardBg: string
  inputBg: string
}

const dark: ThemeColors = {
  bg: "#0A0A0F",
  surface: "#101016",
  surfaceAlt: "#181825",
  border: "#1A1A28",
  borderLight: "#181825",
  text: "#E8E8F0",
  textSecondary: "#8888A0",
  textMuted: "#585870",
  accent: "#6C8CFF",
  accentLight: "rgba(108,140,255,0.08)",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#EAB308",
  overlay: "rgba(0,0,0,0.5)",
  sheetBg: "#0E0E14",
  cardBg: "#101016",
  inputBg: "#0A0A0F",
}

const light: ThemeColors = {
  bg: "#F5F5F8",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F0F4",
  border: "#E2E2E8",
  borderLight: "#E8E8EE",
  text: "#1A1A2E",
  textSecondary: "#6B6B80",
  textMuted: "#9E9EB0",
  accent: "#6C8CFF",
  accentLight: "rgba(108,140,255,0.1)",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#EAB308",
  overlay: "rgba(0,0,0,0.3)",
  sheetBg: "#FFFFFF",
  cardBg: "#FFFFFF",
  inputBg: "#F0F0F4",
}

interface ThemeContextType {
  mode: "dark" | "light"
  toggle: () => void
  c: ThemeColors
}

const ThemeContext = createContext<ThemeContextType>({ mode: "dark", toggle: () => {}, c: dark })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setMode] = useState<"dark" | "light">("dark")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem("@themeMode")
      .then((stored) => {
        if (stored === "light" || stored === "dark") setMode(stored)
        else if (systemScheme === "light") setMode("light")
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      AsyncStorage.setItem("@themeMode", next)
      return next
    })
  }, [])

  if (!loaded) return null

  return (
    <ThemeContext.Provider value={{ mode, toggle, c: mode === "dark" ? dark : light }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
