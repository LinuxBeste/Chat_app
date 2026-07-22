import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { api } from "../../lib/api"
import { useTheme, type CustomThemeData, type ThemeConfig } from "../../lib/theme-context"
import { Palette, Check, Trash2, Plus, X, PaintBucket, MessageSquare, Type, Sparkles } from "lucide-react"

const defaultThemeConfig: ThemeConfig = {
  colors: {
    "bg-primary": "#F5F5F7",
    "bg-secondary": "#FFFFFF",
    surface: "#FFFFFF",
    border: "#E5E7EB",
    accent: "#4850BB",
    "accent-hover": "#535BCC",
    "text-primary": "#111827",
    "text-secondary": "#6B7280",
    "text-muted": "#9CA3AF",
  },
  bubbleStyle: "cozy",
  borderRadius: 24,
  statusEmoji: "",
}

function bubbleStyleOptions(t: (key: string) => string) {
  return [
    { value: "compact", label: t("themeEditor.bubbleStyles.compact") },
    { value: "cozy", label: t("themeEditor.bubbleStyles.cozy") },
    { value: "alternating", label: t("themeEditor.bubbleStyles.alternating") },
  ] as const
}

function colorKeys(t: (key: string) => string) {
  return [
    { key: "bg-primary", label: t("themeEditor.background") },
    { key: "bg-secondary", label: t("themeEditor.secondaryBg") },
    { key: "surface", label: t("themeEditor.surface") },
    { key: "border", label: t("themeEditor.border") },
    { key: "accent", label: t("themeEditor.accent") },
    { key: "accent-hover", label: t("themeEditor.accentHover") },
    { key: "text-primary", label: t("themeEditor.text") },
    { key: "text-secondary", label: t("themeEditor.textSecondary") },
    { key: "text-muted", label: t("themeEditor.textMuted") },
  ]
}

interface ThemeEditorProps {
  onClose?: () => void
}

export function ThemeEditor({ onClose }: ThemeEditorProps) {
  const { t } = useTranslation()
  const { customTheme, applyTheme, clearCustomTheme, refreshCustomTheme } = useTheme()
  const [themes, setThemes] = useState<CustomThemeData[]>([])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [config, setConfig] = useState<ThemeConfig>(defaultThemeConfig)

  useEffect(() => {
    api<CustomThemeData[]>("/api/themes")
      .then(setThemes)
      .catch(() => {})
  }, [])

  const createTheme = async () => {
    if (!name.trim()) return
    try {
      const created = await api<CustomThemeData>("/api/themes", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), theme: config }),
      })
      setThemes((prev) => [created, ...prev])
      applyTheme(created)
      setName("")
      setEditing(false)
    } catch {}
  }

  const activateTheme = async (t: CustomThemeData) => {
    try {
      await api(`/api/themes/${t.id}/activate`, { method: "POST" })
      applyTheme(t)
    } catch {}
  }

  const deleteTheme = async (id: string) => {
    try {
      await api(`/api/themes/${id}`, { method: "DELETE" })
      setThemes((prev) => prev.filter((t) => t.id !== id))
      if (customTheme?.id === id) clearCustomTheme()
    } catch {}
  }

  const setColor = (key: keyof NonNullable<ThemeConfig["colors"]>, value: string) => {
    setConfig((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }))
  }

  const setBubbleStyle = (value: "compact" | "cozy" | "alternating") => {
    setConfig((prev) => ({ ...prev, bubbleStyle: value }))
  }

  const setBorderRadius = (value: number) => {
    setConfig((prev) => ({ ...prev, borderRadius: value }))
  }

  const setStatusEmoji = (value: string) => {
    setConfig((prev) => ({ ...prev, statusEmoji: value }))
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
        <Palette className="h-4 w-4 text-text-muted" />
        {t("themeEditor.customThemes")}
      </h2>

      {/* Existing themes */}
      <div className="space-y-1.5">
        {themes.map((theme) => {
          const isActive = customTheme?.id === theme.id
          return (
            <div
              key={theme.id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                isActive ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
              }`}
            >
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: (() => {
                    try {
                      return JSON.parse(theme.theme).colors?.["accent"] || "#4850BB"
                    } catch {
                      return "#4850BB"
                    }
                  })(),
                  color: "#fff",
                }}
              >
                {theme.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{theme.name}</p>
                <p className="text-xs text-text-muted">
                  {isActive ? t("themeEditor.active") : t("themeEditor.clickActivate")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!isActive && (
                  <button
                    onClick={() => activateTheme(theme)}
                    className="p-2 rounded-xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
                    aria-label={t("themeEditor.activateTheme")}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteTheme(theme.id)}
                  className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
                  aria-label={t("themeEditor.deleteTheme")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        )}
      </div>

      {/* Create new theme */}
      {editing ? (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">{t("themeEditor.newTheme")}</span>
            <button
              onClick={() => setEditing(false)}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("themeEditor.themeNamePlaceholder")}
            maxLength={64}
            className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
          />

          {/* Colors */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <PaintBucket className="h-3.5 w-3.5" />
              {t("themeEditor.colors")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {colorKeys(t).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.colors?.[key] ?? "#000000"}
                    onChange={(e) => setColor(key, e.target.value)}
                    className="h-8 w-8 rounded-lg border border-border cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{label}</p>
                    <p className="text-[10px] text-text-muted font-mono">{config.colors?.[key] ?? ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bubble style */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {t("themeEditor.chatBubbleStyle")}
            </p>
            <div className="flex gap-2">
              {bubbleStyleOptions(t).map((bs) => (
                <button
                  key={bs.value}
                  onClick={() => setBubbleStyle(bs.value)}
                  className={`flex-1 h-9 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                    config.bubbleStyle === bs.value
                      ? "bg-accent text-white"
                      : "border border-border text-text-secondary hover:border-accent/50"
                  }`}
                >
                  {bs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Border radius */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              {t("themeEditor.borderRadius")}: {config.borderRadius}px
            </p>
            <input
              type="range"
              min={0}
              max={48}
              value={config.borderRadius ?? 24}
              onChange={(e) => setBorderRadius(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Status emoji */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t("themeEditor.statusEmoji")}
            </p>
            <input
              value={config.statusEmoji ?? ""}
              onChange={(e) => setStatusEmoji(e.target.value)}
              placeholder={t("themeEditor.statusEmojiPlaceholder")}
              maxLength={2}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={createTheme}
              disabled={!name.trim()}
              className="flex-1 h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
            >
              {t("themeEditor.createTheme")}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="h-10 rounded-2xl border border-border text-text-secondary text-sm px-4 font-medium hover:bg-white/5 transition-all cursor-pointer"
            >
              {t("themeEditor.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setName("")
            setConfig(defaultThemeConfig)
            setEditing(true)
          }}
          className="flex w-full items-center justify-center gap-2 h-10 rounded-2xl border border-dashed border-border text-text-muted text-sm hover:text-accent hover:border-accent/50 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t("themeEditor.newThemeBtn")}
        </button>
      )}
    </section>
  )
}
