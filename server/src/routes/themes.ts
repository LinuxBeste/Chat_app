import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { validate } from "../middleware/validate.js";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import { userThemes } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router: ReturnType<typeof Router> = Router();

const themeSchema = z.object({
  name: z.string().min(1).max(64),
  theme: z.object({
    colors: z
      .object({
        "bg-primary": z.string().optional(),
        "bg-secondary": z.string().optional(),
        surface: z.string().optional(),
        border: z.string().optional(),
        accent: z.string().optional(),
        "accent-hover": z.string().optional(),
        "text-primary": z.string().optional(),
        "text-secondary": z.string().optional(),
        "text-muted": z.string().optional(),
      })
      .optional(),
    bubbleStyle: z.enum(["compact", "cozy", "alternating"]).optional(),
    borderRadius: z.number().min(0).max(48).optional(),
    statusEmoji: z.string().optional(),
  }),
});

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const themes = await db
      .select()
      .from(userThemes)
      .where(eq(userThemes.userId, req.user!.userId))
      .orderBy(desc(userThemes.createdAt));
    res.json(themes);
  }),
);

router.get(
  "/active",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [theme] = await db
      .select()
      .from(userThemes)
      .where(and(eq(userThemes.userId, req.user!.userId), eq(userThemes.isActive, "true")))
      .limit(1);
    res.json(theme ?? null);
  }),
);

router.post(
  "/",
  authGuard,
  validate(themeSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    await db.update(userThemes).set({ isActive: "false" }).where(eq(userThemes.userId, userId));

    const [theme] = await db
      .insert(userThemes)
      .values({
        userId,
        name: req.body.name,
        theme: JSON.stringify(req.body.theme),
        isActive: "true",
      })
      .returning();

    res.status(201).json(theme);
  }),
);

router.put(
  "/:id",
  authGuard,
  validate(themeSchema),
  catchAsync(async (req: Request, res: Response) => {
    const [theme] = await db
      .update(userThemes)
      .set({
        name: req.body.name,
        theme: JSON.stringify(req.body.theme),
        updatedAt: new Date(),
      })
      .where(and(eq(userThemes.id, req.params.id as string), eq(userThemes.userId, req.user!.userId)))
      .returning();

    if (!theme) {
      res.status(404).json({ error: "Theme not found" });
      return;
    }

    res.json(theme);
  }),
);

router.delete(
  "/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [deleted] = await db
      .delete(userThemes)
      .where(and(eq(userThemes.id, req.params.id as string), eq(userThemes.userId, req.user!.userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Theme not found" });
      return;
    }

    res.json({ message: "Theme deleted" });
  }),
);

router.post(
  "/:id/activate",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [theme] = await db
      .select()
      .from(userThemes)
      .where(and(eq(userThemes.id, req.params.id as string), eq(userThemes.userId, req.user!.userId)))
      .limit(1);

    if (!theme) {
      res.status(404).json({ error: "Theme not found" });
      return;
    }

    await db.update(userThemes).set({ isActive: "false" }).where(eq(userThemes.userId, req.user!.userId));
    await db.update(userThemes).set({ isActive: "true" }).where(eq(userThemes.id, theme.id));

    res.json({ message: "Theme activated" });
  }),
);

export default router;
