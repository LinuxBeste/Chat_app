import { Router, Request, Response } from "express";
import type { Router as RouterType } from "express";
import multer from "multer";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import { db } from "../lib/db.js";
import { attachments } from "../db/schema.js";
import { saveAndScaleUpload } from "../lib/image.js";
import { config } from "../config.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSize },
});

const router: RouterType = Router();

router.post(
  "/",
  authGuard,
  upload.single("file"),
  catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const conversationId = req.body.conversationId || null;
    const result = await saveAndScaleUpload(req.file.buffer, req.file.originalname);
    const [attachment] = await db
      .insert(attachments)
      .values({
        url: result.url,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
        ...(conversationId ? { conversationId } : {}),
      })
      .returning();

    res.status(201).json({
      id: attachment.id,
      url: result.url,
      filename: result.filename,
      size: result.size,
      mimeType: result.mimeType,
      folderId: null,
      createdAt: attachment.createdAt,
    });
  }),
);

export default router;
