import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { friends, users } from "../db/schema.js"
import { eq, and, or } from "drizzle-orm"

const router: RouterType = Router()

const requestSchema = z.object({
  friendId: z.string().uuid(),
})

router.post(
  "/requests",
  authGuard,
  validate(requestSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { friendId } = req.body
    const userId = req.user!.userId

    if (friendId === userId) {
      res.status(400).json({ error: "Cannot friend yourself" })
      return
    }

    const existing = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
          and(eq(friends.userId, friendId), eq(friends.friendId, userId)),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      res.status(409).json({ error: "Friend request already exists" })
      return
    }

    await db.insert(friends).values({ userId, friendId, status: "pending" })
    res.status(201).json({ message: "Friend request sent" })
  }),
)

router.post(
  "/requests/:id/accept",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [updated] = await db
      .update(friends)
      .set({ status: "accepted" })
      .where(
        and(
          eq(friends.userId, req.params.id as string),
          eq(friends.friendId, req.user!.userId),
          eq(friends.status, "pending"),
        ),
      )
      .returning()

    if (!updated) {
      res.status(404).json({ error: "No pending request found" })
      return
    }

    res.json({ message: "Friend request accepted" })
  }),
)

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId

    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
        status_: friends.status,
        createdAt: friends.createdAt,
      })
      .from(friends)
      .innerJoin(users, or(eq(users.id, friends.userId), eq(users.id, friends.friendId)))
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.status, "accepted")),
          and(eq(friends.friendId, userId), eq(friends.status, "accepted")),
        ),
      )

    const filtered = result.filter((r) => r.id !== userId)

    res.json(filtered)
  }),
)

router.delete(
  "/:friendId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const friendId = req.params.friendId

    await db
      .delete(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, friendId as string)),
          and(eq(friends.userId, friendId as string), eq(friends.friendId, userId)),
        ),
      )

    res.json({ message: "Friend removed" })
  }),
)

export default router
