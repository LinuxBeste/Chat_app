import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { blocks, messageReads } from "../db/schema.js"
import { eq, and } from "drizzle-orm"

const router: RouterType = Router()

const blockSchema = z.object({ userId: z.string().uuid() })

router.post(
  "/blocks",
  authGuard,
  validate(blockSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.body
    if (userId === req.user!.userId) {
      res.status(400).json({ error: "Cannot block yourself" })
      return
    }
    await db.insert(blocks).values({ userId: req.user!.userId, blockedUserId: userId }).onConflictDoNothing()
    res.status(201).json({ message: "User blocked" })
  }),
)

router.delete(
  "/blocks/:userId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(blocks)
      .where(and(eq(blocks.userId, req.user!.userId), eq(blocks.blockedUserId, req.params.userId as string)))
    res.json({ message: "User unblocked" })
  }),
)

router.get(
  "/blocks",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const list = await db
      .select({ blockedUserId: blocks.blockedUserId, createdAt: blocks.createdAt })
      .from(blocks)
      .where(eq(blocks.userId, req.user!.userId))
    res.json(list)
  }),
)

router.post(
  "/messages/:id/read",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .insert(messageReads)
      .values({ messageId: req.params.id as string, userId: req.user!.userId })
      .onConflictDoNothing()
    res.status(201).json({ message: "Read receipt recorded" })
  }),
)

router.get(
  "/messages/:id/reads",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const reads = await db
      .select({ userId: messageReads.userId, readAt: messageReads.readAt })
      .from(messageReads)
      .where(eq(messageReads.messageId, req.params.id as string))
    res.json(reads)
  }),
)

export default router
