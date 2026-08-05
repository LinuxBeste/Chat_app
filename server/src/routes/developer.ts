import { Router, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../lib/db.js";
import { validate } from "../middleware/validate.js";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import { webhooks, refreshTokens } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const router: ReturnType<typeof Router> = Router();

// --- Webhooks ---

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

router.get(
  "/webhooks",
  authGuard,
  catchAsync(async (_req: Request, res: Response) => {
    const list = await db.select().from(webhooks).where(eq(webhooks.userId, _req.user!.userId));
    res.json(list);
  }),
);

router.post(
  "/webhooks",
  authGuard,
  validate(webhookSchema),
  catchAsync(async (req: Request, res: Response) => {
    const wh = await db
      .insert(webhooks)
      .values({ userId: req.user!.userId, url: req.body.url, events: req.body.events })
      .returning();
    res.status(201).json(wh[0]);
  }),
);

router.delete(
  "/webhooks/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(webhooks)
      .where(and(eq(webhooks.id, req.params.id as string), eq(webhooks.userId, req.user!.userId)));
    res.json({ message: "Webhook deleted" });
  }),
);

// --- API Keys ---

router.post(
  "/api-keys",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const raw = crypto.randomBytes(32).toString("hex");
    const token = `chat_${raw}`;
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 365 * 86400000); // 1 year
    await db.insert(refreshTokens).values({
      userId: req.user!.userId,
      token: hash,
      expiresAt,
    });
    res.status(201).json({ apiKey: token, expiresAt });
  }),
);

router.get(
  "/api-keys",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const keys = await db
      .select({ id: refreshTokens.id, createdAt: refreshTokens.createdAt, expiresAt: refreshTokens.expiresAt })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, req.user!.userId));
    res.json(keys);
  }),
);

router.delete(
  "/api-keys/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.id, req.params.id as string), eq(refreshTokens.userId, req.user!.userId)));
    res.json({ message: "API key revoked" });
  }),
);

export default router;
