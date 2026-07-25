import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { publicKeys } from "../db/schema.js"
import { eq } from "drizzle-orm"

const router: RouterType = Router()

const publishKeySchema = z.object({
  key: z.string().min(1),
})

router.get("/key/:userId", authGuard, async (req: Request, res: Response) => {
  try {
    const [record] = await db
      .select({ key: publicKeys.key })
      .from(publicKeys)
      .where(eq(publicKeys.userId, req.params.userId as string))
      .limit(1)

    if (!record) {
      res.status(404).json({ error: "No public key found" })
      return
    }
    res.json({ publicKey: record.key })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

router.put("/key", authGuard, validate(publishKeySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { key } = req.body

    const existing = await db.select().from(publicKeys).where(eq(publicKeys.userId, userId)).limit(1)

    if (existing.length > 0) {
      await db
        .update(publicKeys)
        .set({ key, updatedAt: new Date() })
        .where(eq(publicKeys.userId, userId))
    } else {
      await db.insert(publicKeys).values({ userId, key })
    }

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

router.delete("/key", authGuard, async (req: Request, res: Response) => {
  try {
    await db.delete(publicKeys).where(eq(publicKeys.userId, req.user!.userId))
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
