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

const log = createContextLogger("routes:conversations")

const router: RouterType = Router()

const createSchema = z.object({
  type: z.enum(["dm", "group", "channel"]),
  name: z.string().min(1).max(100).optional(),
  participantIds: z.array(z.string().uuid()).min(1),
})

router.post("/", authGuard, validate(createSchema), catchAsync(async (req: Request, res: Response) => {
  try {
    const { type, name, participantIds } = req.body
    const allIds = [...new Set([req.user!.userId, ...participantIds])]

    if (type === "dm") {
      const existing = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.type, "dm"),
          sql`(SELECT COUNT(*) FROM ${participants} WHERE ${participants.conversationId} = ${conversations.id} AND ${participants.userId} = ANY(${sql.join(
            allIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})) = ${allIds.length}`,
        ),
      })

      if (existing) {
        res.json({ id: existing.id })
        return
      }
    }

    const [conv] = await db
      .insert(conversations)
      .values({ type, name: name ?? null, createdBy: req.user!.userId })
      .returning()

    await db.insert(participants).values(allIds.map((userId) => ({ conversationId: conv.id, userId })))

    res.status(201).json(conv)
  } catch (err) {
    log.error({ err }, "Create conversation failed")
    res.status(500).json({ error: "Internal server error" })
  }
}))

router.get("/", authGuard, catchAsync(async (req: Request, res: Response) => {
  const convs = await db
    .select({
      id: conversations.id,
      type: conversations.type,
      name: conversations.name,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(participants, eq(participants.conversationId, conversations.id))
    .where(eq(participants.userId, req.user!.userId))
    .orderBy(desc(conversations.createdAt))

  res.json(convs)
}))

router.get("/:id", authGuard, catchAsync(async (req: Request, res: Response) => {
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
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.conversationId, conv.id))

  res.json({ ...conv, members })
}))

router.put("/:id", authGuard, catchAsync(async (req: Request, res: Response) => {
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
}))

router.get("/:id/messages", authGuard, catchAsync(async (req: Request, res: Response) => {
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
}))

router.get("/:id/files", authGuard, catchAsync(async (req: Request, res: Response) => {
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
}))

export default router
