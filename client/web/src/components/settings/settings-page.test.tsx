import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { SettingsPage } from "./settings-page"

const mockUser = { id: "user-1", username: "testuser", email: "test@test.com", displayName: "Test User" }

vi.mock("../../lib/api", () => ({
  api: vi.fn((url: string) => {
    if (url === "/api/users/preferences") return Promise.resolve({})
    if (url === "/api/users/me") return Promise.resolve({ customStatus: "" })
    return Promise.resolve([])
  }),
}))

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: mockUser, logout: vi.fn() })),
}))

vi.mock("../../lib/theme-context", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    toggleTheme: vi.fn(),
    customTheme: null,
    themeConfig: null,
    lightTheme: null,
    darkTheme: null,
    setLightTheme: vi.fn(),
    setDarkTheme: vi.fn(),
    applyTheme: vi.fn(),
    clearCustomTheme: vi.fn(),
    refreshCustomTheme: vi.fn(),
  })),
  themePresets: [],
  defaultLightTheme: {
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
  },
  defaultDarkTheme: {
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
  },
}))

vi.mock("react-i18next", async () => {
  const en = await import("../../lib/i18n/locales/en.json")
  return {
    useTranslation: () => ({
      t: (k: string) => {
        const parts = k.split(".")
        let obj: any = en
        for (const p of parts) {
          obj = obj?.[p]
          if (obj === undefined) return k
        }
        return typeof obj === "string" ? obj : k
      },
      i18n: { changeLanguage: vi.fn(), language: "en" },
    }),
  }
})

vi.mock("../../lib/i18n", () => {
  const changeLanguage = vi.fn()
  return {
    default: { changeLanguage, language: "en" },
    supportedLanguages: [
      { code: "en", name: "English", native: "English" },
      { code: "de", name: "German", native: "Deutsch" },
      { code: "fr", name: "French", native: "Français" },
    ],
  }
})

import { api } from "../../lib/api"

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows account tab by default with username and email", async () => {
    render(<SettingsPage />)
    expect(screen.getByText("@testuser")).toBeInTheDocument()
    expect(screen.getAllByText("test@test.com").length).toBeGreaterThanOrEqual(1)
  })

  it("shows sidebar with common setting tabs", () => {
    render(<SettingsPage />)
    expect(screen.getAllByText("Account").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Security")).toBeInTheDocument()
    expect(screen.getByText("Appearance")).toBeInTheDocument()
    expect(screen.getByText("Notifications")).toBeInTheDocument()
    expect(screen.getByText("Privacy & Safety")).toBeInTheDocument()
    expect(screen.getByText("About")).toBeInTheDocument()
  })

  it("shows all 14 setting tabs in sidebar", () => {
    render(<SettingsPage />)
    const expectedTabs = [
      "Account",
      "Security",
      "Appearance",
      "Notifications",
      "Privacy & Safety",
      "Chat",
      "Calls",
      "Media",
      "Audio & Video",
      "Accessibility",
      "Keyboard Shortcuts",
      "Language & Region",
      "Advanced",
      "About",
    ]
    for (const tab of expectedTabs) {
      expect(screen.getAllByText(tab).length).toBeGreaterThanOrEqual(1)
    }
  })

  it("shows active sessions on account tab", async () => {
    render(<SettingsPage />)
    expect(screen.getByText("Active Sessions")).toBeInTheDocument()
    expect(screen.getByText("No active sessions")).toBeInTheDocument()
  })

  it("shows email verification section on account tab", () => {
    render(<SettingsPage />)
    expect(screen.getByText("Email Verification")).toBeInTheDocument()
    expect(screen.getByText("Not verified")).toBeInTheDocument()
  })

  it("shows danger zone on account tab", () => {
    render(<SettingsPage />)
    expect(screen.getByText("Danger Zone")).toBeInTheDocument()
    expect(screen.getByText("Delete Account")).toBeInTheDocument()
  })

  it("shows 2FA section when switching to security tab", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ customStatus: "" })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ enabled: false })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => fireEvent.click(screen.getByText("Security")))
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument()
  })

  it("shows Enable 2FA button when 2FA is disabled", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ customStatus: "" })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ enabled: false })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => fireEvent.click(screen.getByText("Security")))
    await waitFor(() => {
      expect(screen.getByText("Enable 2FA")).toBeInTheDocument()
    })
  })

  it("shows Disable 2FA button when 2FA is enabled", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ customStatus: "" })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => fireEvent.click(screen.getByText("Security")))
    await waitFor(() => {
      expect(screen.getByText("Disable 2FA")).toBeInTheDocument()
    })
  })

  it("shows login history when switching to security tab", async () => {
    const loginEntries = [
      { id: "log-1", ip: "192.168.1.1", userAgent: "Chrome 120", success: "true", createdAt: new Date().toISOString() },
    ]
    vi.mocked(api)
      .mockResolvedValueOnce({ customStatus: "" })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ enabled: false })
      .mockResolvedValueOnce(loginEntries)
      .mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => fireEvent.click(screen.getByText("Security")))
    await waitFor(() => {
      expect(screen.getByText("Chrome")).toBeInTheDocument()
    })
  })

  it("shows session controls on security tab", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ customStatus: "" })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ enabled: false })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    render(<SettingsPage />)
    await waitFor(() => fireEvent.click(screen.getByText("Security")))
    expect(screen.getByText("Session Controls")).toBeInTheDocument()
    expect(screen.getByText("Session Timeout")).toBeInTheDocument()
  })

  it("shows appearance tab with theme and layout sections", async () => {
    render(<SettingsPage />)
    await waitFor(() => fireEvent.click(screen.getByText("Appearance")))
    await waitFor(() => {
      expect(screen.getByText("Theme Mode")).toBeInTheDocument()
    })
    expect(screen.getByText("Typography")).toBeInTheDocument()
    expect(screen.getByText("Corners & Radius")).toBeInTheDocument()
    expect(screen.getByText("Layout & Spacing")).toBeInTheDocument()
    expect(screen.getByText("Message Display")).toBeInTheDocument()
    expect(screen.getByText("Animations & Effects")).toBeInTheDocument()
  })

  it("shows notifications tab with preferences", async () => {
    render(<SettingsPage />)
    const notifBtns = screen.getAllByText("Notifications")
    await waitFor(() => fireEvent.click(notifBtns[0]))
    expect(screen.getByText("Messages")).toBeInTheDocument()
  })

  it("shows privacy tab with options", async () => {
    render(<SettingsPage />)
    const privacyBtns = screen.getAllByText("Privacy & Safety")
    await waitFor(() => fireEvent.click(privacyBtns[0]))
    expect(screen.getByText("Read Receipts")).toBeInTheDocument()
  })

  it("shows chat tab with messaging settings", async () => {
    render(<SettingsPage />)
    const chatBtns = screen.getAllByText("Chat")
    await waitFor(() => fireEvent.click(chatBtns[0]))
    expect(screen.getByText("Enter to Send")).toBeInTheDocument()
  })

  it("shows calls tab with audio/video settings", async () => {
    render(<SettingsPage />)
    const callsBtns = screen.getAllByText("Calls")
    await waitFor(() => fireEvent.click(callsBtns[0]))
    expect(screen.getByText("Default Microphone")).toBeInTheDocument()
    expect(screen.getByText("Echo Cancellation")).toBeInTheDocument()
  })

  it("shows media tab with upload settings", async () => {
    render(<SettingsPage />)
    const mediaBtns = screen.getAllByText("Media")
    await waitFor(() => fireEvent.click(mediaBtns[0]))
    expect(screen.getByText("Auto-Play Media")).toBeInTheDocument()
  })

  it("shows audio & video tab with device settings", async () => {
    render(<SettingsPage />)
    const avBtns = screen.getAllByText("Audio & Video")
    await waitFor(() => fireEvent.click(avBtns[0]))
    expect(screen.getByText("Mic Sensitivity")).toBeInTheDocument()
  })

  it("shows accessibility tab with vision settings", async () => {
    render(<SettingsPage />)
    const a11yBtns = screen.getAllByText("Accessibility")
    await waitFor(() => fireEvent.click(a11yBtns[0]))
    expect(screen.getByText("High Contrast")).toBeInTheDocument()
    expect(screen.getByText("Color Blind Mode")).toBeInTheDocument()
  })

  it("shows reading mode settings in accessibility tab", async () => {
    render(<SettingsPage />)
    const a11yBtns = screen.getAllByText("Accessibility")
    await waitFor(() => fireEvent.click(a11yBtns[0]))
    expect(screen.getByText("Reading Mode")).toBeInTheDocument()
    expect(screen.getByText("Reader Mode")).toBeInTheDocument()
  })

  it("shows language tab with language and region settings", async () => {
    render(<SettingsPage />)
    const langBtns = screen.getAllByText("Language & Region")
    await waitFor(() => fireEvent.click(langBtns[0]))
    expect(screen.getByText("App Language")).toBeInTheDocument()
    expect(screen.getByText("Date Format")).toBeInTheDocument()
  })

  it("shows advanced tab with developer settings", async () => {
    render(<SettingsPage />)
    const advBtns = screen.getAllByText("Advanced")
    await waitFor(() => fireEvent.click(advBtns[0]))
    expect(screen.getByText("Developer Mode")).toBeInTheDocument()
    expect(screen.getByText("Hardware Acceleration")).toBeInTheDocument()
  })

  it("shows about tab with version info", async () => {
    render(<SettingsPage />)
    const aboutBtns = screen.getAllByText("About")
    await waitFor(() => fireEvent.click(aboutBtns[0]))
    expect(screen.getByText("Version")).toBeInTheDocument()
    expect(screen.getByText("1.0.0")).toBeInTheDocument()
  })
})
