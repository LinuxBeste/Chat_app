import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { publicKeys } from "../db/schema.js"
import { eq, desc, and } from "drizzle-orm"

const router: RouterType = Router()

const LEGACY_DEVICE_ID = "legacy"

const publishKeySchema = z.object({
  key: z.string().min(1),
  deviceId: z.string().min(1).max(128).optional(),
})

// Latest key for a user (backwards compatible with the single-key model).
router.get("/key/:userId", authGuard, async (req: Request, res: Response) => {
  try {
    const [record] = await db
      .select({ key: publicKeys.key, deviceId: publicKeys.deviceId })
      .from(publicKeys)
      .where(eq(publicKeys.userId, req.params.userId as string))
      .orderBy(desc(publicKeys.updatedAt))
      .limit(1)

    if (!record) {
      res.json({ publicKey: null })
      return
    }
    res.json({ publicKey: record.key, deviceId: record.deviceId })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// Key for a specific device of a user (used to decrypt messages by keyId).
router.get("/key/:userId/:deviceId", authGuard, async (req: Request, res: Response) => {
  try {
    const [record] = await db
      .select({ key: publicKeys.key })
      .from(publicKeys)
      .where(and(eq(publicKeys.userId, req.params.userId as string), eq(publicKeys.deviceId, req.params.deviceId as string)))
      .limit(1)

    if (!record) {
      res.json({ publicKey: null })
      return
    }
    res.json({ publicKey: record.key })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// All active keys (per device) for a user.
router.get("/keys/:userId", authGuard, async (req: Request, res: Response) => {
  try {
    const records = await db
      .select({ deviceId: publicKeys.deviceId, publicKey: publicKeys.key, updatedAt: publicKeys.updatedAt })
      .from(publicKeys)
      .where(eq(publicKeys.userId, req.params.userId as string))
      .orderBy(desc(publicKeys.updatedAt))

    res.json({ keys: records })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// Publish (or update) the public key for the calling user's device.
router.put("/key", authGuard, validate(publishKeySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { key } = req.body
    const deviceId: string = req.body.deviceId ?? LEGACY_DEVICE_ID

    const existing = await db
      .select({ id: publicKeys.id })
      .from(publicKeys)
      .where(and(eq(publicKeys.userId, userId), eq(publicKeys.deviceId, deviceId)))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(publicKeys)
        .set({ key, updatedAt: new Date() })
        .where(eq(publicKeys.id, existing[0].id))
    } else {
      await db.insert(publicKeys).values({ userId, deviceId, key })
    }

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

router.delete("/key", authGuard, async (req: Request, res: Response) => {
  try {
    const deviceId: string | undefined = req.query.deviceId as string | undefined
    if (deviceId) {
      await db
        .delete(publicKeys)
        .where(and(eq(publicKeys.userId, req.user!.userId), eq(publicKeys.deviceId, deviceId)))
    } else {
      await db.delete(publicKeys).where(eq(publicKeys.userId, req.user!.userId))
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router