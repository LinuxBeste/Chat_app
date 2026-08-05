import { Router, Request, Response } from "express";
import type { Router as RouterType } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { validate } from "../middleware/validate.js";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import { friends, users } from "../db/schema.js";
import { eq, and, or, ilike } from "drizzle-orm";

const router: RouterType = Router();

const requestSchema = z
  .object({
    friendId: z.string().uuid().optional(),
    username: z.string().min(1).max(30).optional(),
  })
  .refine((data) => data.friendId || data.username, {
    message: "Either friendId or username is required",
  });

router.get(
  "/search",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q || q.length < 1) {
      res.json([]);
      return;
    }

    let results;
    if (q.includes("@")) {
      results = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatar: users.avatar,
          status: users.status,
        })
        .from(users)
        .where(ilike(users.email, `%${q}%`))
        .limit(10);
    } else if (/^[0-9a-f-]+$/i.test(q) && q.length >= 8) {
      results = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatar: users.avatar,
          status: users.status,
        })
        .from(users)
        .where(ilike(users.id, `${q}%`))
        .limit(10);
    } else {
      results = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatar: users.avatar,
          status: users.status,
        })
        .from(users)
        .where(ilike(users.username, `%${q}%`))
        .limit(10);
    }

    res.json(results);
  }),
);

router.get(
  "/lookup",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) {
      res.status(400).json({ error: "Query parameter required" });
      return;
    }

    let user;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
      [user] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, q))
        .limit(1);
    } else {
      [user] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
          status: users.status,
        })
        .from(users)
        .where(eq(users.username, q))
        .limit(1);
    }

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  }),
);

router.get(
  "/status/:userId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const targetId = req.params.userId as string;

    if (targetId === userId) {
      res.json({ status: "self" });
      return;
    }

    const [rel] = await db
      .select({ status: friends.status })
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, targetId)),
          and(eq(friends.userId, targetId), eq(friends.friendId, userId)),
        ),
      )
      .limit(1);

    res.json({ status: rel?.status ?? "none" });
  }),
);

router.post(
  "/requests",
  authGuard,
  validate(requestSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    let friendId = req.body.friendId;

    if (!friendId && req.body.username) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, req.body.username))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "User not found by username" });
        return;
      }
      friendId = user.id;
    }

    if (friendId === userId) {
      res.status(400).json({ error: "Cannot friend yourself" });
      return;
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
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Friend request already exists" });
      return;
    }

    await db.insert(friends).values({ userId, friendId, status: "pending" });
    res.status(201).json({ message: "Friend request sent" });
  }),
);

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
      .returning();

    if (!updated) {
      res.status(404).json({ error: "No pending request found" });
      return;
    }

    res.json({ message: "Friend request accepted" });
  }),
);

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

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
      );

    const filtered = result.filter((r) => r.id !== userId);

    res.json(filtered);
  }),
);

router.get(
  "/pending",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

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
      .innerJoin(users, eq(users.id, friends.userId))
      .where(and(eq(friends.friendId, userId), eq(friends.status, "pending")));

    res.json(result);
  }),
);

router.delete(
  "/:friendId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const friendId = req.params.friendId;

    await db
      .delete(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, friendId as string)),
          and(eq(friends.userId, friendId as string), eq(friends.friendId, userId)),
        ),
      );

    res.json({ message: "Friend removed" });
  }),
);

export default router;
