import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../lib/auth-context"
import { useTheme } from "../../lib/theme-context"
import i18n, { supportedLanguages } from "../../lib/i18n"
import { api } from "../../lib/api"
import { Sun, Moon, User, ArrowRight, Check } from "lucide-react"

export function SetupDialog() {
  const { t } = useTranslation()
  const { completeSetup } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)

  const steps = [
    {
      title: t("setup.welcome"),
      description: t("setup.welcomeDesc"),
      content: (
        <div className="text-center py-6">
          <div className="text-4xl mb-4">👋</div>
          <p className="text-sm text-text-muted">{t("setup.welcomeText")}</p>
        </div>
      ),
    },
    {
      title: t("setup.chooseLanguage"),
      description: t("setup.chooseLanguageDesc"),
      content: (
        <div className="grid grid-cols-2 gap-2 py-2">
          {supportedLanguages
            .filter((l) => ["en", "de", "fr", "es", "ja"].includes(l.code))
            .map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer text-left ${
                  i18n.language === lang.code
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border text-text-primary hover:border-accent/50"
                }`}
              >
                <span className="text-sm">{lang.native}</span>
                {i18n.language === lang.code && <Check className="h-4 w-4 ml-auto shrink-0" />}
              </button>
            ))}
        </div>
      ),
    },
    {
      title: t("setup.chooseTheme"),
      description: t("setup.chooseThemeDesc"),
      content: (
        <div className="flex gap-3 py-4 justify-center">
          <button
            onClick={() => {
              if (theme !== "light") toggleTheme()
            }}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all cursor-pointer ${
              theme === "light" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            }`}
          >
            <Sun className={`h-8 w-8 ${theme === "light" ? "text-accent" : "text-text-muted"}`} />
            <span className={`text-sm font-medium ${theme === "light" ? "text-accent" : "text-text-primary"}`}>
              {t("settings.appearance.lightMode")}
            </span>
            {theme === "light" && <Check className="h-4 w-4 text-accent" />}
          </button>
          <button
            onClick={() => {
              if (theme !== "dark") toggleTheme()
            }}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all cursor-pointer ${
              theme === "dark" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            }`}
          >
            <Moon className={`h-8 w-8 ${theme === "dark" ? "text-accent" : "text-text-muted"}`} />
            <span className={`text-sm font-medium ${theme === "dark" ? "text-accent" : "text-text-primary"}`}>
              {t("settings.appearance.darkMode")}
            </span>
            {theme === "dark" && <Check className="h-4 w-4 text-accent" />}
          </button>
        </div>
      ),
    },
    {
      title: t("setup.displayName"),
      description: t("setup.displayNameDesc"),
      content: (
        <div className="py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent text-xl font-bold mx-auto mb-4">
            {displayName ? displayName[0].toUpperCase() : <User className="h-6 w-6" />}
          </div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("setup.displayNamePlaceholder")}
            maxLength={30}
            className="w-full h-12 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 text-center"
          />
        </div>
      ),
    },
  ]

  const current = steps[step]

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    try {
      if (displayName.trim()) {
        await api("/api/users/me", {
          method: "PUT",
          body: JSON.stringify({ displayName: displayName.trim() }),
        })
      }
    } catch {
      /* Ignored */
    }
    completeSetup()
    setSaving(false)
  }

  const handleSkip = () => {
    completeSetup()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-[32px] border border-border bg-surface shadow-xl p-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
              />
            ))}
          </div>
          <span className="text-xs text-text-muted">
            {step + 1} / {steps.length}
          </span>
        </div>

        <h2 className="text-lg font-semibold text-text-primary mt-4">{current.title}</h2>
        <p className="text-sm text-text-muted mb-4">{current.description}</p>

        {current.content}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSkip}
            className="flex-1 h-11 rounded-2xl border border-border text-text-secondary text-sm font-medium hover:bg-white/5 transition-all cursor-pointer"
          >
            {t("setup.skip")}
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 h-11 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? (
              t("common.saving")
            ) : step < steps.length - 1 ? (
              <>
                <span>{t("setup.next")}</span> <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> <span>{t("setup.finish")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
