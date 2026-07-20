import { useState } from "react"
import { useAuth } from "../../lib/auth-context"

export function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm rounded-[32px] border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold text-text-primary mb-1">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {mode === "login" ? "Sign in to your account" : "Register to get started"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <button
            type="submit"
            className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-text-muted mt-6 text-center">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            aria-label={mode === "login" ? "Switch to register" : "Switch to sign in"}
            className="text-accent hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded"
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  )
}
