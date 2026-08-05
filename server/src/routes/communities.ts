import { Router, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../lib/db.js";
import { validate } from "../middleware/validate.js";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import {
  communities,
  communityMembers,
  communityChannels,
  communityVoiceChannels,
  communityInvites,
} from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: ReturnType<typeof Router> = Router();

// --- Communities ---

const createSchema = z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional() });

router.post(
  "/",
  authGuard,
  validate(createSchema),
  catchAsync(async (req: Request, res: Response) => {
    const [community] = await db
      .insert(communities)
      .values({ name: req.body.name, description: req.body.description, ownerId: req.user!.userId })
      .returning();
    await db.insert(communityMembers).values({ communityId: community.id, userId: req.user!.userId, role: "owner" });
    res.status(201).json(community);
  }),
);

router.get(
  "/",
  authGuard,
  catchAsync(async (_req: Request, res: Response) => {
    const list = await db.select().from(communities).orderBy(desc(communities.createdAt));
    res.json(list);
  }),
);

router.get(
  "/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, req.params.id as string))
      .limit(1);
    if (!community) {
      res.status(404).json({ error: "Community not found" });
      return;
    }
    const members = await db.select().from(communityMembers).where(eq(communityMembers.communityId, community.id));
    const channels = await db.select().from(communityChannels).where(eq(communityChannels.communityId, community.id));
    const voiceChannels = await db
      .select()
      .from(communityVoiceChannels)
      .where(eq(communityVoiceChannels.communityId, community.id));
    res.json({ ...community, members, channels, voiceChannels });
  }),
);

const requireCommunityOwner = async (req: Request, res: Response, next: () => void) => {
  try {
    const communityId = req.params.id as string;
    const [member] = await db
      .select({ role: communityMembers.role })
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, req.user!.userId)))
      .limit(1);
    if (!member || !["owner", "admin"].includes(member.role)) {
      res.status(403).json({ error: "Owner or admin access required" });
      return;
    }
    next();
  } catch (err) {
    logger.error({ err }, "Community admin guard error");
    res.status(500).json({ error: "Internal server error" });
  }
};

router.put(
  "/:id",
  authGuard,
  requireCommunityOwner,
  validate(createSchema),
  catchAsync(async (req: Request, res: Response) => {
    const [updated] = await db
      .update(communities)
      .set({ name: req.body.name, description: req.body.description })
      .where(eq(communities.id, req.params.id as string))
      .returning();
    res.json(updated);
  }),
);

// --- Channels ---

const channelSchema = z.object({ name: z.string().min(1).max(100), topic: z.string().max(200).optional() });

router.post(
  "/:id/channels",
  authGuard,
  requireCommunityOwner,
  validate(channelSchema),
  catchAsync(async (req: Request, res: Response) => {
    const [ch] = await db
      .insert(communityChannels)
      .values({ communityId: req.params.id as string, name: req.body.name, topic: req.body.topic })
      .returning();
    res.status(201).json(ch);
  }),
);

router.delete(
  "/channels/:channelId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(communityChannels).where(eq(communityChannels.id, req.params.channelId as string));
    res.json({ message: "Channel deleted" });
  }),
);

// --- Voice Channels ---

router.post(
  "/:id/voice",
  authGuard,
  requireCommunityOwner,
  validate(z.object({ name: z.string().min(1).max(100) })),
  catchAsync(async (req: Request, res: Response) => {
    const [ch] = await db
      .insert(communityVoiceChannels)
      .values({ communityId: req.params.id as string, name: req.body.name })
      .returning();
    res.status(201).json(ch);
  }),
);

router.delete(
  "/voice/:voiceId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(communityVoiceChannels).where(eq(communityVoiceChannels.id, req.params.voiceId as string));
    res.json({ message: "Voice channel deleted" });
  }),
);

// --- Members ---

router.delete(
  "/:id/members/:userId",
  authGuard,
  requireCommunityOwner,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, req.params.id as string),
          eq(communityMembers.userId, req.params.userId as string),
        ),
      );
    res.json({ message: "Member removed" });
  }),
);

// --- Community management ---

router.delete(
  "/:id",
  authGuard,
  requireCommunityOwner,
  catchAsync(async (req: Request, res: Response) => {
    await db.delete(communities).where(eq(communities.id, req.params.id as string));
    res.json({ message: "Community deleted" });
  }),
);

router.post(
  "/:id/leave",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [member] = await db
      .select({ role: communityMembers.role })
      .from(communityMembers)
      .where(
        and(eq(communityMembers.communityId, req.params.id as string), eq(communityMembers.userId, req.user!.userId)),
      )
      .limit(1);
    if (!member) {
      res.status(404).json({ error: "Not a member of this community" });
      return;
    }
    if (member.role === "owner") {
      res.status(400).json({ error: "Owner cannot leave; delete the community instead" });
      return;
    }
    await db
      .delete(communityMembers)
      .where(
        and(eq(communityMembers.communityId, req.params.id as string), eq(communityMembers.userId, req.user!.userId)),
      );
    res.json({ message: "Left community" });
  }),
);

router.put(
  "/:id/members/:userId/role",
  authGuard,
  requireCommunityOwner,
  validate(z.object({ role: z.enum(["owner", "admin", "member"]) })),
  catchAsync(async (req: Request, res: Response) => {
    await db
      .update(communityMembers)
      .set({ role: req.body.role })
      .where(
        and(
          eq(communityMembers.communityId, req.params.id as string),
          eq(communityMembers.userId, req.params.userId as string),
        ),
      );
    res.json({ message: "Role updated" });
  }),
);

// --- Invites ---

router.post(
  "/:id/invites",
  authGuard,
  requireCommunityOwner,
  catchAsync(async (req: Request, res: Response) => {
    const code = crypto.randomBytes(4).toString("hex");
    const [invite] = await db
      .insert(communityInvites)
      .values({ communityId: req.params.id as string, createdBy: req.user!.userId, code })
      .returning();
    res.status(201).json(invite);
  }),
);

router.post(
  "/join/:code",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [invite] = await db
      .select()
      .from(communityInvites)
      .where(eq(communityInvites.code, req.params.code as string))
      .limit(1);
    if (!invite) {
      res.status(404).json({ error: "Invalid invite code" });
      return;
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      res.status(410).json({ error: "Invite expired" });
      return;
    }
    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      res.status(410).json({ error: "Invite max uses reached" });
      return;
    }
    const existing = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, invite.communityId), eq(communityMembers.userId, req.user!.userId)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Already a member" });
      return;
    }
    await db.insert(communityMembers).values({ communityId: invite.communityId, userId: req.user!.userId });
    await db
      .update(communityInvites)
      .set({ useCount: sql`${communityInvites.useCount} + 1` })
      .where(eq(communityInvites.id, invite.id));
    res.json({ message: "Joined community" });
  }),
);

export default router;
