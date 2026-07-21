import { Router, type Request, type Response } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { pinnedMessages, messages, users } from "../db/schema.js"
import { eq, and, like, desc } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

// --- Pinned Messages ---

router.post(
  "/pins",
  authGuard,
  validate(z.object({ conversationId: z.string().uuid(), messageId: z.string().uuid() })),
  catchAsync(async (req: Request, res: Response) => {
    await db
      .insert(pinnedMessages)
      .values({
        conversationId: req.body.conversationId,
        messageId: req.body.messageId,
        pinnedBy: req.user!.userId,
      })
      .onConflictDoNothing()
    res.status(201).json({ message: "Message pinned" })
  }),
)

router.delete(
  "/pins/:conversationId/:messageId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(pinnedMessages)
      .where(
        and(
          eq(pinnedMessages.conversationId, req.params.conversationId as string),
          eq(pinnedMessages.messageId, req.params.messageId as string),
        ),
      )
    res.json({ message: "Message unpinned" })
  }),
)

router.get(
  "/pins/:conversationId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const pins = await db
      .select({
        id: pinnedMessages.id,
        messageId: pinnedMessages.messageId,
        messageContent: messages.content,
        messageType: messages.type,
        senderUsername: users.username,
        pinnedAt: pinnedMessages.createdAt,
      })
      .from(pinnedMessages)
      .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(pinnedMessages.conversationId, req.params.conversationId as string))
      .orderBy(desc(pinnedMessages.createdAt))
    res.json(pins)
  }),
)

// --- Search ---

router.get(
  "/search",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const query = req.query.q as string | undefined
    if (!query || query.length < 2) {
      res.status(400).json({ error: "Query must be at least 2 characters" })
      return
    }
    const results = await db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        createdAt: messages.createdAt,
        senderUsername: users.username,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(like(messages.content, `%${query}%`), eq(messages.type, "text")))
      .orderBy(desc(messages.createdAt))
      .limit(50)
    res.json(results)
  }),
)

export default router
