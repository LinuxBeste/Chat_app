import { Router, type Request, type Response } from "express"
import { db } from "../lib/db.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { calls } from "../db/schema.js"
import { or, eq, desc } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const userId = req.user!.userId
    const list = await db
      .select()
      .from(calls)
      .where(or(eq(calls.callerId, userId), eq(calls.calleeId, userId)))
      .orderBy(desc(calls.createdAt))
      .limit(limit)
    res.json(list)
  }),
)

export default router
