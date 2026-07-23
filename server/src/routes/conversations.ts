import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { conversations, participants, messages, users, attachments } from "../db/schema.js"
import { eq, and, desc, sql } from "drizzle-orm"
import { createContextLogger } from "../lib/logger.js"
import { clients } from "../ws/clients.js"

const log = createContextLogger("routes:conversations")

const router: RouterType = Router()

const createSchema = z.object({
  type: z.enum(["dm", "group", "channel"]),
  name: z.string().min(1).max(100).optional(),
  participantIds: z.array(z.string().uuid()).min(1),
})

router.post(
  "/",
  authGuard,
  validate(createSchema),
  catchAsync(async (req: Request, res: Response) => {
    try {
      const { type, name, participantIds } = req.body
      const allIds = [...new Set([req.user!.userId, ...participantIds])]

      if (type === "dm") {
        const dms = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(eq(conversations.type, "dm"))
        let existing: { id: string } | undefined
        for (const dm of dms) {
          const members = await db
            .select({ userId: participants.userId })
            .from(participants)
            .where(eq(participants.conversationId, dm.id))
          const memberIds = members.map((m) => m.userId).sort()
          const targetIds = [...allIds].sort()
          if (memberIds.length === targetIds.length && memberIds.every((id, i) => id === targetIds[i])) {
            existing = dm
            break
          }
        }

        if (existing) {
          const [fullConv] = await db
            .select({ id: conversations.id, type: conversations.type, name: conversations.name, createdAt: conversations.createdAt })
            .from(conversations)
            .where(eq(conversations.id, existing.id))
            .limit(1)

          const other = await db
            .select({
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatar: users.avatar,
              customStatus: users.customStatus,
            })
            .from(participants)
            .innerJoin(users, eq(users.id, participants.userId))
            .where(and(eq(participants.conversationId, existing.id), sql`${participants.userId} != ${req.user!.userId}`))
            .limit(1)

          res.json({ ...fullConv, otherUser: other[0] ?? null })
          return
        }
      }

      const [conv] = await db
        .insert(conversations)
        .values({ type, name: name ?? null, createdBy: req.user!.userId })
        .returning()

      await db.insert(participants).values(
        allIds.map((userId) => ({
          conversationId: conv.id,
          userId,
          role: userId === req.user!.userId ? "owner" : "member",
        })),
      )

      if (type === "dm") {
        const other = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar,
            customStatus: users.customStatus,
          })
          .from(participants)
          .innerJoin(users, eq(users.id, participants.userId))
          .where(and(eq(participants.conversationId, conv.id), sql`${participants.userId} != ${req.user!.userId}`))
          .limit(1)

        res.status(201).json({ ...conv, otherUser: other[0] ?? null })
      } else {
        res.status(201).json(conv)
      }
    } catch (err) {
      log.error({ err }, "Create conversation failed")
      res.status(500).json({ error: "Internal server error" })
    }
  }),
)

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const convs = await db
      .select({
        id: conversations.id,
        type: conversations.type,
        name: conversations.name,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .innerJoin(participants, eq(participants.conversationId, conversations.id))
      .where(eq(participants.userId, userId))
      .orderBy(desc(conversations.createdAt))

    const seen = new Set<string>()
    const unique = convs.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    const enriched = await Promise.all(
      unique.map(async (conv) => {
        if (conv.type !== "dm") return conv

        const other = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar,
            customStatus: users.customStatus,
          })
          .from(participants)
          .innerJoin(users, eq(users.id, participants.userId))
          .where(and(eq(participants.conversationId, conv.id), sql`${participants.userId} != ${userId}`))
          .limit(1)

        return {
          ...conv,
          otherUser: other[0] ?? null,
        }
      }),
    )

    res.json(enriched)
  }),
)

router.get(
  "/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" })
      return
    }

    const members = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
        role: participants.role,
      })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(eq(participants.conversationId, conv.id))

    res.json({ ...conv, members })
  }),
)

router.put(
  "/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { name } = req.body
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Name is required" })
      return
    }
    const [updated] = await db
      .update(conversations)
      .set({ name })
      .where(eq(conversations.id, req.params.id as string))
      .returning()
    res.json(updated)
  }),
)

const addParticipantsSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1),
})

router.post(
  "/:id/participants",
  authGuard,
  validate(addParticipantsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const convId = req.params.id as string
    const { participantIds } = req.body

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1)
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" })
      return
    }
    if (conv.type === "dm") {
      res.status(400).json({ error: "Cannot add participants to a DM" })
      return
    }

    const existingParticipants = await db
      .select({ userId: participants.userId })
      .from(participants)
      .where(eq(participants.conversationId, convId))

    const existingIds = new Set(existingParticipants.map((p) => p.userId))
    const newIds = participantIds.filter((id: string) => !existingIds.has(id))

    if (newIds.length === 0) {
      res.status(400).json({ error: "All users are already participants" })
      return
    }

    await db.insert(participants).values(newIds.map((userId: string) => ({ conversationId: convId, userId })))

    const added = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName, avatar: users.avatar, status: users.status, role: participants.role })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(and(eq(participants.conversationId, convId), sql`${participants.userId} IN (${sql.join(newIds.map((id: string) => sql`${id}::uuid`), sql`, `)})`))

    res.status(201).json(added)
  }),
)

router.delete(
  "/:id/participants/:userId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const convId = req.params.id as string
    const targetUserId = req.params.userId as string

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1)
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" })
      return
    }

    if (conv.createdBy === targetUserId && req.user!.userId !== targetUserId) {
      res.status(403).json({ error: "Cannot remove the conversation owner" })
      return
    }

    await db
      .delete(participants)
      .where(and(eq(participants.conversationId, convId), eq(participants.userId, targetUserId)))

    const userSockets = clients.get(targetUserId)
    if (userSockets) {
      for (const ws of userSockets) {
        ws.send(JSON.stringify({ type: "participant:removed", conversationId: convId }))
        ws.close()
      }
      clients.delete(targetUserId)
    }

    res.json({ message: "Participant removed" })
  }),
)

router.put(
  "/:id/participants/:userId/role",
  authGuard,
  validate(z.object({ role: z.enum(["owner", "admin", "member"]) })),
  catchAsync(async (req: Request, res: Response) => {
    const convId = req.params.id as string
    const targetUserId = req.params.userId as string
    const { role } = req.body

    await db
      .update(participants)
      .set({ role })
      .where(and(eq(participants.conversationId, convId), eq(participants.userId, targetUserId)))

    res.json({ message: "Role updated" })
  }),
)

router.get(
  "/:id/messages",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const msgs = await db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
        editedAt: messages.editedAt,
        sender: {
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        },
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .where(eq(messages.conversationId, req.params.id as string))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset)

    res.json(msgs.reverse())
  }),
)

router.put(
  "/:id/messages/:msgId",
  authGuard,
  validate(z.object({ content: z.string().min(1).max(5000) })),
  catchAsync(async (req: Request, res: Response) => {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, req.params.msgId as string), eq(messages.conversationId, req.params.id as string)))
      .limit(1)

    if (!msg) {
      res.status(404).json({ error: "Message not found" })
      return
    }
    if (msg.senderId !== req.user!.userId) {
      res.status(403).json({ error: "Not your message" })
      return
    }
    if (msg.deletedAt) {
      res.status(400).json({ error: "Cannot edit deleted message" })
      return
    }

    const [updated] = await db
      .update(messages)
      .set({ content: req.body.content, editedAt: new Date() })
      .where(eq(messages.id, msg.id))
      .returning()

    res.json(updated)
  }),
)

router.delete(
  "/:id/messages/:msgId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, req.params.msgId as string), eq(messages.conversationId, req.params.id as string)))
      .limit(1)

    if (!msg) {
      res.status(404).json({ error: "Message not found" })
      return
    }
    if (msg.senderId !== req.user!.userId) {
      res.status(403).json({ error: "Not your message" })
      return
    }
    if (msg.deletedAt) {
      res.status(400).json({ error: "Message already deleted" })
      return
    }

    await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, msg.id))

    res.json({ message: "Message deleted" })
  }),
)

router.get(
  "/:id/files",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const fileMsgs = await db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        createdAt: messages.createdAt,
        sender: { username: users.username },
        attachment: {
          url: attachments.url,
          filename: attachments.filename,
          mimeType: attachments.mimeType,
          size: attachments.size,
        },
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .leftJoin(attachments, eq(attachments.messageId, messages.id))
      .where(and(eq(messages.conversationId, req.params.id as string), eq(messages.type, "file")))
      .orderBy(desc(messages.createdAt))
      .limit(50)

    res.json(fileMsgs.filter((m) => m.attachment))
  }),
)

export default router
