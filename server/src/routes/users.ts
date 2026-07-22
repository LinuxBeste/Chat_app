import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { users, userPreferences } from "../db/schema.js"
import { eq, ilike, or, and, ne } from "drizzle-orm"

const router: RouterType = Router()

const searchSchema = z.object({
  q: z.string().min(1).max(50),
})

router.get(
  "/me",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        avatar: users.avatar,
        bio: users.bio,
        customStatus: users.customStatus,
        status: users.status,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1)

    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }

    res.json(user)
  }),
)

router.put(
  "/me",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { displayName, avatar, bio, customStatus } = req.body
    const [updated] = await db
      .update(users)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(customStatus !== undefined && { customStatus }),
      })
      .where(eq(users.id, req.user!.userId))
      .returning()

    res.json({
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      avatar: updated.avatar,
      bio: updated.bio,
      customStatus: updated.customStatus,
      status: updated.status,
    })
  }),
)

router.get(
  "/search",
  authGuard,
  validate(searchSchema, "query"),
  catchAsync(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string }
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          ne(users.id, req.user!.userId),
          or(ilike(users.username, `%${q}%`), ilike(users.displayName ?? "", `%${q}%`)),
        ),
      )
      .limit(20)

    res.json(results)
  }),
)

router.get(
  "/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, req.params.id as string))
      .limit(1)

    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }

    res.json(user)
  }),
)

router.get(
  "/preferences",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [pref] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, req.user!.userId))
      .limit(1)
    res.json(pref ? JSON.parse(pref.preferences) : {})
  }),
)

router.put(
  "/preferences",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const prefs = JSON.stringify(req.body)
    await db
      .insert(userPreferences)
      .values({ userId: req.user!.userId, preferences: prefs })
      .onConflictDoUpdate({ target: userPreferences.userId, set: { preferences: prefs, updatedAt: new Date() } })
    res.json(req.body)
  }),
)

export default router
