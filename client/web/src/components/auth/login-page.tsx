import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../lib/auth-context"
import { Eye, EyeOff } from "lucide-react"

export function LoginPage() {
  const { t } = useTranslation()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.somethingWentWrong"))
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold text-text-primary mb-1">
          {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {mode === "login" ? t("auth.signInToAccount") : t("auth.registerToStart")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label htmlFor="username" className="sr-only">
                {t("auth.username")}
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.username")}
                className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">
              {t("auth.email")}
            </label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("auth.email")}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="sr-only">
              {t("auth.password")}
            </label>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.password")}
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary pr-10 px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer"
          >
            {mode === "login" ? t("auth.signIn") : t("auth.createAccountBtn")}
          </button>
        </form>

        <p className="text-sm text-text-muted mt-6 text-center">
          {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            aria-label={mode === "login" ? t("auth.switchToRegister") : t("auth.switchToSignIn")}
            className="text-accent hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded"
          >
            {mode === "login" ? t("auth.register") : t("auth.signInLink")}
          </button>
        </p>
      </div>
    </div>
  )
}
