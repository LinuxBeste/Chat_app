import { Router, type Request, type Response } from "express"
import { db } from "../lib/db.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { config } from "../config.js"
import { users, conversations, reports, bans, messages } from "../db/schema.js"
import { eq, desc, count, inArray } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (!config.admin.userIds.includes(req.user!.userId)) {
    res.status(403).json({ error: "Admin access required" })
    return
  }
  next()
}

const requireOwner = (req: Request, res: Response, next: () => void) => {
  if (req.user!.userId !== config.admin.ownerUserId) {
    res.status(403).json({ error: "Owner access required" })
    return
  }
  next()
}

router.get(
  "/stats",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    const [userCount] = await db.select({ value: count() }).from(users)
    const [convCount] = await db.select({ value: count() }).from(conversations)
    const [msgCount] = await db.select({ value: count() }).from(messages)
    const [reportCount] = await db.select({ value: count() }).from(reports)
    const [banCount] = await db.select({ value: count() }).from(bans)

    res.json({
      users: userCount.value,
      conversations: convCount.value,
      messages: msgCount.value,
      reports: reportCount.value,
      bans: banCount.value,
    })
  }),
)

router.get(
  "/users",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    const list = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(100)
    res.json(list)
  }),
)

router.delete(
  "/users/:id",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(users).where(eq(users.id, req.params.id as string))
    res.json({ message: "User deleted" })
  }),
)

router.get(
  "/reports",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    const list = await db
      .select({
        id: reports.id,
        reportedBy: reports.reportedBy,
        targetUserId: reports.targetUserId,
        targetMessageId: reports.targetMessageId,
        reason: reports.reason,
        status: reports.status,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(100)
    res.json(list)
  }),
)

router.put(
  "/reports/:id",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body
    if (!status || !["open", "resolved", "dismissed"].includes(status)) {
      res.status(400).json({ error: "Invalid status" })
      return
    }
    await db.update(reports).set({ status }).where(eq(reports.id, req.params.id as string))
    res.json({ message: "Report updated" })
  }),
)

router.get(
  "/bans",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    const list = await db
      .select({
        id: bans.id,
        conversationId: bans.conversationId,
        userId: bans.userId,
        bannedBy: bans.bannedBy,
        reason: bans.reason,
        createdAt: bans.createdAt,
      })
      .from(bans)
      .orderBy(desc(bans.createdAt))
      .limit(100)
    res.json(list)
  }),
)

router.delete(
  "/bans/:id",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(bans).where(eq(bans.id, req.params.id as string))
    res.json({ message: "Ban removed" })
  }),
)

router.get(
  "/admins",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    if (!config.admin.ownerUserId) {
      res.json({ ownerId: null, adminIds: config.admin.userIds })
      return
    }
    const ownerId = config.admin.ownerUserId
    const adminIds = config.admin.userIds.filter((id) => id !== ownerId)
    res.json({ ownerId, adminIds })
  }),
)

router.post(
  "/admins",
  authGuard,
  requireOwner,
  catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.body
    if (!userId) {
      res.status(400).json({ error: "userId required" })
      return
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }
    if (config.admin.userIds.includes(userId)) {
      res.status(409).json({ error: "User is already an admin" })
      return
    }
    config.admin.userIds.push(userId)
    res.json({ message: "Admin added", adminIds: config.admin.userIds.filter((id) => id !== config.admin.ownerUserId) })
  }),
)

router.delete(
  "/admins/:userId",
  authGuard,
  requireOwner,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.userId as string
    if (userId === config.admin.ownerUserId) {
      res.status(400).json({ error: "Cannot remove owner as admin" })
      return
    }
    const idx = config.admin.userIds.indexOf(userId)
    if (idx === -1) {
      res.status(404).json({ error: "User is not an admin" })
      return
    }
    config.admin.userIds.splice(idx, 1)
    res.json({ message: "Admin removed", adminIds: config.admin.userIds.filter((id) => id !== config.admin.ownerUserId) })
  }),
)

export default router
