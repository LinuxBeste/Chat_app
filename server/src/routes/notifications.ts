import { Router, type Request, type Response } from "express"
import { db } from "../lib/db.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { notifications } from "../db/schema.js"
import { eq, and, desc, sql } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
    res.json(list)
  }),
)

router.get(
  "/unread-count",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [result] = await db
      .select({ count: sql`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, req.user!.userId), eq(notifications.isRead, "false")))
    res.json({ count: Number(result?.count ?? 0) })
  }),
)

router.post(
  "/:id/read",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .update(notifications)
      .set({ isRead: "true" })
      .where(and(eq(notifications.id, req.params.id as string), eq(notifications.userId, req.user!.userId)))
    res.json({ message: "Marked as read" })
  }),
)

router.post(
  "/read-all",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .update(notifications)
      .set({ isRead: "true" })
      .where(and(eq(notifications.userId, req.user!.userId), eq(notifications.isRead, "false")))
    res.json({ message: "All marked as read" })
  }),
)

export default router
