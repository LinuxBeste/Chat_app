import { Router, type Request, type Response } from "express"
import { z } from "zod"
import crypto from "crypto"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { totpSecrets, loginHistory } from "../db/schema.js"
import { eq, desc } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

// --- TOTP Setup ---

router.post("/totp/setup", authGuard, async (req: Request, res: Response) => {
  const secret = crypto.randomBytes(20).toString("hex")
  await db
    .insert(totpSecrets)
    .values({ userId: req.user!.userId, secret })
    .onConflictDoUpdate({ target: totpSecrets.userId, set: { secret, verified: "false" } })
  res.json({ secret, uri: `otpauth://totp/Chat:${req.user!.username}?secret=${secret}&issuer=Chat` })
})

router.post(
  "/totp/verify",
  authGuard,
  validate(z.object({ code: z.string().length(6) })),
  async (req: Request, res: Response) => {
    const [record] = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, req.user!.userId)).limit(1)

    if (!record) {
      res.status(400).json({ error: "TOTP not set up" })
      return
    }

    const expected = totp(record.secret)
    if (req.body.code !== expected) {
      res.status(400).json({ error: "Invalid code" })
      return
    }

    await db.update(totpSecrets).set({ verified: "true" }).where(eq(totpSecrets.userId, req.user!.userId))

    res.json({ message: "2FA enabled" })
  },
)

router.post("/totp/disable", authGuard, async (req: Request, res: Response) => {
  await db.delete(totpSecrets).where(eq(totpSecrets.userId, req.user!.userId))
  res.json({ message: "2FA disabled" })
})

router.get("/totp/status", authGuard, async (req: Request, res: Response) => {
  const [record] = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, req.user!.userId)).limit(1)
  res.json({ enabled: record?.verified === "true" })
})

// --- Login History ---

router.get("/history", authGuard, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
  const history = await db
    .select()
    .from(loginHistory)
    .where(eq(loginHistory.userId, req.user!.userId))
    .orderBy(desc(loginHistory.createdAt))
    .limit(limit)
  res.json(history)
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
