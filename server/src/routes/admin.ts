import { Router, type Request, type Response } from "express";
import { db } from "../lib/db.js";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import { config } from "../config.js";
import { users, conversations, reports, bans, messages } from "../db/schema.js";
import { eq, desc, count, and, gte, like, or, sql } from "drizzle-orm";

const router: ReturnType<typeof Router> = Router();

const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (!config.admin.userIds.includes(req.user!.userId) && config.admin.ownerUserId !== req.user!.userId) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

const requireOwner = (req: Request, res: Response, next: () => void) => {
  if (req.user!.userId !== config.admin.ownerUserId) {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  next();
};

router.get(
  "/stats",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [convCount] = await db.select({ value: count() }).from(conversations);
    const [msgCount] = await db.select({ value: count() }).from(messages);
    const [reportCount] = await db.select({ value: count() }).from(reports);
    const [banCount] = await db.select({ value: count() }).from(bans);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [regToday] = await db.select({ value: count() }).from(users).where(gte(users.createdAt, today));

    const [onlineCount] = await db
      .select({ value: count() })
      .from(users)
      .where(sql`status IN ('online', 'away', 'busy')`);

    const [msgToday] = await db.select({ value: count() }).from(messages).where(gte(messages.createdAt, today));

    res.json({
      users: userCount.value,
      conversations: convCount.value,
      messages: msgCount.value,
      reports: reportCount.value,
      bans: banCount.value,
      registrationsToday: regToday.value,
      onlineUsers: onlineCount.value,
      messagesToday: msgToday.value,
    });
  }),
);

router.get(
  "/users",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const q = (req.query.q as string)?.trim() || "";
    const status = (req.query.status as string) || "";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          like(users.username, `%${q}%`),
          like(users.email, `%${q}%`),
          like(users.displayName, `%${q}%`),
          like(users.id, `%${q}%`),
        ),
      );
    }
    if (status && ["online", "away", "busy", "offline"].includes(status)) {
      conditions.push(eq(users.status, status as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        status: users.status,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(users).where(where);

    res.json({ users: list, total: total.value, page, limit });
  }),
);

router.get(
  "/users/:id",
  authGuard,
  requireAdmin,
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
      .where(eq(users.id, req.params.id as string))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [msgCount] = await db.select({ value: count() }).from(messages).where(eq(messages.senderId, user.id));

    const [convCount] = await db
      .select({ value: count() })
      .from(conversations)
      .where(eq(conversations.createdBy, user.id));

    const userBans = await db
      .select()
      .from(bans)
      .where(eq(bans.userId, user.id))
      .orderBy(desc(bans.createdAt))
      .limit(10);

    const isAdmin = config.admin.userIds.includes(user.id) || config.admin.ownerUserId === user.id;

    res.json({ ...user, messageCount: msgCount.value, conversationCount: convCount.value, bans: userBans, isAdmin });
  }),
);

router.put(
  "/users/:id/suspend",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const { suspended } = req.body;
    await db
      .update(users)
      .set({ status: suspended ? "busy" : "offline" })
      .where(eq(users.id, req.params.id as string));
    res.json({ message: suspended ? "User suspended" : "User unsuspended" });
  }),
);

router.delete(
  "/users/:id",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(users).where(eq(users.id, req.params.id as string));
    res.json({ message: "User deleted" });
  }),
);

router.get(
  "/reports",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const status = (req.query.status as string) || "";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status && ["open", "resolved", "dismissed"].includes(status)) {
      conditions.push(eq(reports.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

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
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(reports).where(where);

    const userIds = new Set<string>();
    list.forEach((r) => {
      if (r.reportedBy) userIds.add(r.reportedBy);
      if (r.targetUserId) userIds.add(r.targetUserId);
    });
    const userMap = new Map<string, string>();
    if (userIds.size > 0) {
      const userRows = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(
          sql`id IN (${Array.from(userIds)
            .map((id) => sql`${id}`)
            .join(", ")})`,
        )
        .catch(() => []);
      userRows.forEach((u) => userMap.set(u.id, u.username));
    }

    const enriched = list.map((r) => ({
      ...r,
      reportedByName: userMap.get(r.reportedBy) || r.reportedBy.slice(0, 8),
      targetUserName: r.targetUserId ? userMap.get(r.targetUserId) || r.targetUserId.slice(0, 8) : null,
    }));

    res.json({ reports: enriched, total: total.value, page, limit });
  }),
);

router.put(
  "/reports/:id",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body;
    if (!status || !["open", "resolved", "dismissed"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, req.params.id as string));
    res.json({ message: "Report updated" });
  }),
);

router.get(
  "/bans",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const q = (req.query.q as string)?.trim() || "";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    const conditions = q ? [like(bans.userId, `%${q}%`)] : [];
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: bans.id,
        conversationId: bans.conversationId,
        userId: bans.userId,
        bannedBy: bans.bannedBy,
        reason: bans.reason,
        expiresAt: bans.expiresAt,
        createdAt: bans.createdAt,
      })
      .from(bans)
      .where(where)
      .orderBy(desc(bans.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(bans).where(where);

    res.json({ bans: list, total: total.value, page, limit });
  }),
);

router.delete(
  "/bans/:id",
  authGuard,
  requireAdmin,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(bans).where(eq(bans.id, req.params.id as string));
    res.json({ message: "Ban removed" });
  }),
);

router.get(
  "/activity",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    const limit = 50;

    const recentMessages = await db
      .select({
        id: messages.id,
        type: sql`'message'`.as("type"),
        userId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    const recentReports = await db
      .select({
        id: reports.id,
        type: sql`'report'`.as("type"),
        userId: reports.reportedBy,
        content: reports.reason,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(limit);

    const recentBans = await db
      .select({
        id: bans.id,
        type: sql`'ban'`.as("type"),
        userId: bans.bannedBy,
        content: sql`COALESCE(${bans.reason}, 'Banned')`,
        createdAt: bans.createdAt,
      })
      .from(bans)
      .orderBy(desc(bans.createdAt))
      .limit(limit);

    const all = [...recentMessages, ...recentReports, ...recentBans]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const userIds = new Set<string>();
    all.forEach((a) => {
      if (a.userId) userIds.add(a.userId as string);
    });
    const userMap = new Map<string, string>();
    if (userIds.size > 0) {
      const userRows = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(
          sql`id IN (${Array.from(userIds)
            .map((id) => sql`${id}`)
            .join(", ")})`,
        )
        .catch(() => []);
      userRows.forEach((u) => userMap.set(u.id, u.username));
    }

    const enriched = all.map((a) => ({
      ...a,
      username: userMap.get(a.userId as string) || (a.userId as string).slice(0, 8),
    }));

    res.json(enriched);
  }),
);

router.get(
  "/admins",
  authGuard,
  requireAdmin,
  catchAsync(async (_req: Request, res: Response) => {
    if (!config.admin.ownerUserId) {
      res.json({ ownerId: null, adminIds: config.admin.userIds });
      return;
    }
    const ownerId = config.admin.ownerUserId;
    const adminIds = config.admin.userIds.filter((id) => id !== ownerId);
    res.json({ ownerId, adminIds });
  }),
);

router.post(
  "/admins",
  authGuard,
  requireOwner,
  catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (config.admin.userIds.includes(userId)) {
      res.status(409).json({ error: "User is already an admin" });
      return;
    }
    config.admin.userIds.push(userId);
    res.json({
      message: "Admin added",
      adminIds: config.admin.userIds.filter((id) => id !== config.admin.ownerUserId),
    });
  }),
);

router.delete(
  "/admins/:userId",
  authGuard,
  requireOwner,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    if (userId === config.admin.ownerUserId) {
      res.status(400).json({ error: "Cannot remove owner as admin" });
      return;
    }
    const idx = config.admin.userIds.indexOf(userId);
    if (idx === -1) {
      res.status(404).json({ error: "User is not an admin" });
      return;
    }
    config.admin.userIds.splice(idx, 1);
    res.json({
      message: "Admin removed",
      adminIds: config.admin.userIds.filter((id) => id !== config.admin.ownerUserId),
    });
  }),
);

export default router;
