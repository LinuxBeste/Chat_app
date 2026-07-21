import { Router, type Request, type Response } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { events, eventRsvps } from "../db/schema.js"
import { eq, and, desc } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

const createSchema = z.object({
  conversationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
})

router.post("/", authGuard, validate(createSchema), async (req: Request, res: Response) => {
  const [event] = await db
    .insert(events)
    .values({
      conversationId: req.body.conversationId,
      createdBy: req.user!.userId,
      title: req.body.title,
      description: req.body.description,
      startsAt: new Date(req.body.startsAt),
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
    })
    .returning()
  res.status(201).json(event)
})

router.get("/", authGuard, async (_req: Request, res: Response) => {
  const list = await db.select().from(events).orderBy(desc(events.startsAt)).limit(50)
  res.json(list)
})

router.get("/:id", authGuard, async (req: Request, res: Response) => {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, req.params.id as string))
    .limit(1)
  if (!event) {
    res.status(404).json({ error: "Event not found" })
    return
  }
  const rsvps = await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, event.id))
  res.json({ ...event, rsvps })
})

router.post(
  "/:id/rsvp",
  authGuard,
  validate(z.object({ status: z.enum(["going", "maybe", "declined"]) })),
  async (req: Request, res: Response) => {
    const existing = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, req.params.id as string), eq(eventRsvps.userId, req.user!.userId)))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(eventRsvps)
        .set({ status: req.body.status })
        .where(and(eq(eventRsvps.eventId, req.params.id as string), eq(eventRsvps.userId, req.user!.userId)))
    } else {
      await db
        .insert(eventRsvps)
        .values({ eventId: req.params.id as string, userId: req.user!.userId, status: req.body.status })
    }
    res.json({ message: "RSVP updated" })
  },
)

export default router
