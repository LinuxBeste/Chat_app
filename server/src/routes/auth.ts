import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { hashPassword, verifyPassword } from "../lib/password.js"
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt.js"
import { validate } from "../middleware/validate.js"
import { users } from "../db/schema.js"
import { eq } from "drizzle-orm"

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

    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    console.error("Register error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }

    const payload = { userId: user.id, username: user.username }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    console.error("Login error:", err)
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

    const payload = verifyToken(refreshToken)
    const newAccess = signAccessToken({ userId: payload.userId, username: payload.username })
    const newRefresh = signRefreshToken({ userId: payload.userId, username: payload.username })

    res.json({ accessToken: newAccess, refreshToken: newRefresh })
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" })
  }
})

export default router
