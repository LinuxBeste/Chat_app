import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import crypto from "crypto"
import { db } from "../lib/db.js"
import { hashPassword, verifyPassword } from "../lib/password.js"
import { signAccessToken, signRefreshToken, signSessionToken, verifyToken } from "../lib/jwt.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { users, totpSecrets, loginHistory, refreshTokens } from "../db/schema.js"
import { eq, and, desc, lt } from "drizzle-orm"
import { createContextLogger } from "../lib/logger.js"

const log = createContextLogger("auth")

const router: RouterType = Router()

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const login2faSchema = z.object({
  sessionToken: z.string().min(1),
  code: z.string().length(6),
})

const REFRESH_TOKEN_TTL_MS = 7 * 86400000
const LOCKOUT_THRESHOLD = 10
const LOCKOUT_WINDOW_MS = 3600000

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function writeLoginHistory(userId: string, ip: string | undefined, userAgent: string | undefined, success: string) {
  db.insert(loginHistory)
    .values({ userId, ip: ip ?? null, userAgent: userAgent ?? null, success })
    .catch((err) => log.error({ err }, "Failed to write login history"))
}

async function isLockedOut(email: string): Promise<boolean> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (!user) return false

  const cutoff = new Date(Date.now() - LOCKOUT_WINDOW_MS)
  const recent = await db
    .select()
    .from(loginHistory)
    .where(and(eq(loginHistory.userId, user.id), eq(loginHistory.success, "false"), lt(cutoff, loginHistory.createdAt)))
    .limit(LOCKOUT_THRESHOLD)

  return recent.length >= LOCKOUT_THRESHOLD
}

router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" })
      return
    }

    const passwordHash = await hashPassword(password)
    const [user] = await db.insert(users).values({ username, email, passwordHash }).returning()

    const payload = { userId: user.id, username: user.username }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    const tokenHash = hashToken(refreshToken)
    await db
      .insert(refreshTokens)
      .values({ userId: user.id, token: tokenHash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) })

    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    })
    log.info({ userId: user.id, username: user.username }, "User registered")
  } catch (err) {
    log.error({ err, email: req.body.email }, "Register failed")
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const ip = req.ip ?? req.socket.remoteAddress
    const userAgent = req.headers["user-agent"]

    if (await isLockedOut(email)) {
      res.status(429).json({ error: "Account temporarily locked. Try again later." })
      return
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      writeLoginHistory(user.id, ip, userAgent, "false")
      res.status(401).json({ error: "Invalid email or password" })
      return
    }

    const payload = { userId: user.id, username: user.username }

    const [totpRecord] = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, user.id)).limit(1)
    if (totpRecord?.verified === "true") {
      const sessionToken = signSessionToken(payload)
      writeLoginHistory(user.id, ip, userAgent, "true")
      res.json({ requires2fa: true, sessionToken })
      return
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    const tokenHash = hashToken(refreshToken)
    await db
      .insert(refreshTokens)
      .values({ userId: user.id, token: tokenHash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) })

    writeLoginHistory(user.id, ip, userAgent, "true")
    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    })
    log.info({ userId: user.id }, "User logged in")
  } catch (err) {
    log.error({ err, email: req.body.email }, "Login failed")
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/login/2fa", validate(login2faSchema), async (req: Request, res: Response) => {
  try {
    const { sessionToken, code } = req.body

    let payload
    try {
      payload = verifyToken(sessionToken)
    } catch {
      res.status(401).json({ error: "Invalid or expired session token" })
      return
    }

    if (payload.purpose !== "2fa") {
      res.status(401).json({ error: "Invalid session token purpose" })
      return
    }

    const [record] = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, payload.userId)).limit(1)
    if (!record || record.verified !== "true") {
      res.status(400).json({ error: "2FA not enabled" })
      return
    }

    const expected = totp(record.secret)
    if (code !== expected) {
      res.status(400).json({ error: "Invalid 2FA code" })
      return
    }

    const userPayload = { userId: payload.userId, username: payload.username }
    const accessToken = signAccessToken(userPayload)
    const refreshToken = signRefreshToken(userPayload)
    const tokenHash = hashToken(refreshToken)
    await db
      .insert(refreshTokens)
      .values({ userId: payload.userId, token: tokenHash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) })

    res.json({ accessToken, refreshToken })
    log.info({ userId: payload.userId }, "2FA login complete")
  } catch (err) {
    log.error({ err }, "2FA login failed")
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" })
      return
    }

    let payload
    try {
      payload = verifyToken(refreshToken)
    } catch {
      res.status(401).json({ error: "Invalid or expired refresh token" })
      return
    }

    const tokenHash = hashToken(refreshToken)
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, tokenHash), eq(refreshTokens.userId, payload.userId)))
      .limit(1)

    if (!stored) {
      res.status(401).json({ error: "Refresh token revoked or not found" })
      return
    }

    if (stored.expiresAt < new Date()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id))
      res.status(401).json({ error: "Refresh token expired" })
      return
    }

    // Rotate: delete old, issue new pair
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id))

    const userPayload = { userId: payload.userId, username: payload.username }
    const newAccess = signAccessToken(userPayload)
    const newRefresh = signRefreshToken(userPayload)
    const newHash = hashToken(newRefresh)
    await db
      .insert(refreshTokens)
      .values({ userId: payload.userId, token: newHash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) })

    res.json({ accessToken: newAccess, refreshToken: newRefresh })
    log.info({ userId: payload.userId }, "Token refreshed")
  } catch (err) {
    log.warn({ err }, "Token refresh failed")
    res.status(401).json({ error: "Invalid or expired refresh token" })
  }
})

router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" })
      return
    }

    let payload
    try {
      payload = verifyToken(refreshToken)
    } catch {
      res.status(401).json({ error: "Invalid or expired refresh token" })
      return
    }

    const tokenHash = hashToken(refreshToken)
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.token, tokenHash), eq(refreshTokens.userId, payload.userId)))

    res.json({ message: "Logged out" })
    log.info({ userId: payload.userId }, "User logged out")
  } catch (err) {
    log.error({ err }, "Logout failed")
    res.status(500).json({ error: "Internal server error" })
  }
})

router.get("/sessions", authGuard, async (req: Request, res: Response) => {
  try {
    const sessions = await db
      .select({ id: refreshTokens.id, createdAt: refreshTokens.createdAt, expiresAt: refreshTokens.expiresAt })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, req.user!.userId))
      .orderBy(desc(refreshTokens.createdAt))

    res.json(sessions)
  } catch (err) {
    log.error({ err }, "Get sessions failed")
    res.status(500).json({ error: "Internal server error" })
  }
})

router.delete("/sessions/:id", authGuard, async (req: Request, res: Response) => {
  try {
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.id, req.params.id as string), eq(refreshTokens.userId, req.user!.userId)))

    res.json({ message: "Session revoked" })
  } catch (err) {
    log.error({ err }, "Revoke session failed")
    res.status(500).json({ error: "Internal server error" })
  }
})

// Simple TOTP implementation (RFC 6238)
function totp(secret: string): string {
  let counter = Math.floor(Date.now() / 30000)
  const buf = Buffer.alloc(8)
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff
    counter >>= 8
  }
  const hmac = crypto.createHmac("sha1", Buffer.from(secret, "hex")).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1000000).padStart(6, "0")
}

export default router
