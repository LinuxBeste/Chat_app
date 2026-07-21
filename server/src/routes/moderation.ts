import { Router, type Request, type Response } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { reports, bans, mutes, participants } from "../db/schema.js"
import { eq, and } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

const adminGuard = async (req: Request, res: Response, next: () => void) => {
  try {
    const convId = req.params.conversationId || req.body.conversationId
    if (!convId) {
      res.status(400).json({ error: "conversationId required" })
      return
    }
    const membership = await db
      .select()
      .from(participants)
      .where(and(eq(participants.conversationId, convId), eq(participants.userId, req.user!.userId)))
      .limit(1)
    if (!membership.length || !["admin", "owner"].includes(membership[0].role)) {
      res.status(403).json({ error: "Admin access required" })
      return
    }
    next()
  } catch (err) {
    console.error("Admin guard error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// --- Reports ---

const reportSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  targetMessageId: z.string().uuid().optional(),
  reason: z.string().min(1),
  conversationId: z.string().uuid().optional(),
})

router.post("/reports", authGuard, validate(reportSchema), async (req: Request, res: Response) => {
  await db.insert(reports).values({
    reportedBy: req.user!.userId,
    targetUserId: req.body.targetUserId,
    targetMessageId: req.body.targetMessageId,
    reason: req.body.reason,
  })
  res.status(201).json({ message: "Report submitted" })
})

router.get("/reports", authGuard, async (_req: Request, res: Response) => {
  const list = await db.select().from(reports).orderBy(reports.createdAt)
  res.json(list)
})

// --- Bans ---

router.post(
  "/bans",
  authGuard,
  validate(z.object({ conversationId: z.string().uuid(), userId: z.string().uuid(), reason: z.string().optional() })),
  adminGuard,
  async (req: Request, res: Response) => {
    await db.insert(bans).values({
      conversationId: req.body.conversationId,
      userId: req.body.userId,
      bannedBy: req.user!.userId,
      reason: req.body.reason,
    })
    await db
      .delete(participants)
      .where(and(eq(participants.conversationId, req.body.conversationId), eq(participants.userId, req.body.userId)))
    res.status(201).json({ message: "User banned" })
  },
)

router.delete("/bans/:conversationId/:userId", authGuard, adminGuard, async (req: Request, res: Response) => {
  await db
    .delete(bans)
    .where(
      and(eq(bans.conversationId, req.params.conversationId as string), eq(bans.userId, req.params.userId as string)),
    )
  res.json({ message: "User unbanned" })
})

router.get("/bans/:conversationId", authGuard, async (req: Request, res: Response) => {
  const list = await db
    .select()
    .from(bans)
    .where(eq(bans.conversationId, req.params.conversationId as string))
  res.json(list)
})

// --- Mutes ---

router.post(
  "/mutes",
  authGuard,
  validate(z.object({ conversationId: z.string().uuid(), lengthHours: z.number().optional() })),
  async (req: Request, res: Response) => {
    const expiresAt = req.body.lengthHours ? new Date(Date.now() + req.body.lengthHours * 3600000) : null
    await db
      .insert(mutes)
      .values({ conversationId: req.body.conversationId, userId: req.user!.userId, expiresAt })
      .onConflictDoNothing()
    res.status(201).json({ message: "Conversation muted" })
  },
)

router.delete("/mutes/:conversationId", authGuard, async (req: Request, res: Response) => {
  await db
    .delete(mutes)
    .where(and(eq(mutes.conversationId, req.params.conversationId as string), eq(mutes.userId, req.user!.userId)))
  res.json({ message: "Conversation unmuted" })
})

export default router
