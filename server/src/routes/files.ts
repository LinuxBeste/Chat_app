import { Router, type Request, type Response } from "express";
import { db } from "../lib/db.js";
import { authGuard } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error-handler.js";
import { fileFolders, fileFolderMembers, filePermissions, attachments, messages, participants } from "../db/schema.js";
import { eq, and, or, isNull, desc, inArray } from "drizzle-orm";

const router: ReturnType<typeof Router> = Router();

// --- Rename file ---

router.put(
  "/:id/rename",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { filename } = req.body;
    if (!filename || !filename.trim()) {
      res.status(400).json({ error: "filename required" });
      return;
    }

    const [file] = await db
      .update(attachments)
      .set({ filename: filename.trim() })
      .where(eq(attachments.id, req.params.id as string))
      .returning();

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.json(file);
  }),
);

// --- Move file to folder ---

router.put(
  "/:id/move",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { folderId } = req.body;
    const fileId = req.params.id as string;

    const [file] = await db
      .update(attachments)
      .set({ folderId: folderId || null })
      .where(eq(attachments.id, fileId))
      .returning();

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.json(file);
  }),
);

// --- Folders ---

router.get(
  "/folders",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const folders = await db
      .select()
      .from(fileFolders)
      .where(
        or(
          eq(fileFolders.userId, userId),
          and(eq(fileFolderMembers.userId, userId), eq(fileFolderMembers.folderId, fileFolders.id)),
        ),
      )
      .leftJoin(fileFolderMembers, eq(fileFolderMembers.folderId, fileFolders.id))
      .orderBy(fileFolders.createdAt);

    const result: any[] = [];
    const seen = new Set<string>();
    for (const row of folders) {
      if (!seen.has(row.file_folders.id)) {
        seen.add(row.file_folders.id);
        result.push(row.file_folders);
      }
    }
    res.json(result);
  }),
);

router.post(
  "/folders",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { name, parentId } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Folder name required" });
      return;
    }

    const [folder] = await db
      .insert(fileFolders)
      .values({ userId: req.user!.userId, name: name.trim(), parentId: parentId || null })
      .returning();

    res.status(201).json(folder);
  }),
);

router.put(
  "/folders/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Folder name required" });
      return;
    }

    const [folder] = await db
      .update(fileFolders)
      .set({ name: name.trim() })
      .where(eq(fileFolders.id, req.params.id as string))
      .returning();

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
    res.json(folder);
  }),
);

router.delete(
  "/folders/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const folder = await db.query.fileFolders.findFirst({
      where: eq(fileFolders.id, req.params.id as string),
    });
    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
    if (folder.userId !== userId) {
      res.status(403).json({ error: "Not your folder" });
      return;
    }

    await db.delete(fileFolderMembers).where(eq(fileFolderMembers.folderId, folder.id));
    await db.delete(fileFolders).where(eq(fileFolders.id, folder.id));
    res.json({ message: "Folder deleted" });
  }),
);

// --- Folder Members ---

router.get(
  "/folders/:id/members",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const members = await db
      .select()
      .from(fileFolderMembers)
      .where(eq(fileFolderMembers.folderId, req.params.id as string));
    res.json(members);
  }),
);

router.post(
  "/folders/:id/members",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { userIds, permission } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: "userIds array required" });
      return;
    }
    const folderId = req.params.id as string;

    const rows = userIds.map((uid: string) => ({
      folderId,
      userId: uid,
      permission: permission || "read",
    }));

    const inserted = await db.insert(fileFolderMembers).values(rows).onConflictDoNothing().returning();
    res.status(201).json(inserted);
  }),
);

router.delete(
  "/folders/:id/members/:userId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(fileFolderMembers)
      .where(
        and(
          eq(fileFolderMembers.folderId, req.params.id as string),
          eq(fileFolderMembers.userId, req.params.userId as string),
        ),
      );
    res.json({ message: "Member removed" });
  }),
);

// --- File Permissions ---

router.get(
  "/permissions/:fileId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const perms = await db
      .select()
      .from(filePermissions)
      .where(eq(filePermissions.fileId, req.params.fileId as string));

    res.json(perms);
  }),
);

router.post(
  "/permissions/:fileId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { userId, permission } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }

    await db
      .insert(filePermissions)
      .values({ fileId: req.params.fileId as string, userId, permission: permission || "read" })
      .onConflictDoNothing();

    res.status(201).json({ message: "Permission added" });
  }),
);

router.delete(
  "/permissions/:fileId/:userId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(filePermissions)
      .where(
        and(
          eq(filePermissions.fileId, req.params.fileId as string),
          eq(filePermissions.userId, req.params.userId as string),
        ),
      );
    res.json({ message: "Permission removed" });
  }),
);

// --- File listing (files user can access) ---

router.get(
  "/list",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const userConversations = await db
      .select({ conversationId: participants.conversationId })
      .from(participants)
      .where(eq(participants.userId, userId));

    const conversationIds = userConversations.map((p) => p.conversationId);

    const conditions: ReturnType<typeof and>[] = [isNull(attachments.messageId)];
    if (conversationIds.length > 0) {
      const convMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(inArray(messages.conversationId, conversationIds));
      const messageIds = convMessages.map((m) => m.id);
      if (messageIds.length > 0) {
        conditions.push(inArray(attachments.messageId, messageIds));
      }
    }

    const files = await db
      .select({
        id: attachments.id,
        url: attachments.url,
        filename: attachments.filename,
        mimeType: attachments.mimeType,
        size: attachments.size,
        createdAt: attachments.createdAt,
        messageId: attachments.messageId,
        folderId: attachments.folderId,
      })
      .from(attachments)
      .where(or(...conditions))
      .orderBy(desc(attachments.id))
      .limit(100);

    res.json(files);
  }),
);

export default router;
