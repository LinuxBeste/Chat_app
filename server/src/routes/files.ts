import { Router, type Request, type Response } from "express"
import { z } from "zod"
import { db } from "../lib/db.js"
import { validate } from "../middleware/validate.js"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { fileFolders, fileFolderMembers, filePermissions, attachments } from "../db/schema.js"
import { eq, and, or, isNull } from "drizzle-orm"

const router: ReturnType<typeof Router> = Router()

// --- Folders ---

router.get(
  "/folders",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const folders = await db
      .select()
      .from(fileFolders)
      .where(
        or(
          eq(fileFolders.userId, userId),
          and(
            eq(fileFolderMembers.userId, userId),
            eq(fileFolderMembers.folderId, fileFolders.id),
          ),
        ),
      )
      .leftJoin(fileFolderMembers, eq(fileFolderMembers.folderId, fileFolders.id))
      .orderBy(fileFolders.createdAt)

    const result: any[] = []
    const seen = new Set<string>()
    for (const row of folders) {
      if (!seen.has(row.file_folders.id)) {
        seen.add(row.file_folders.id)
        result.push(row.file_folders)
      }
    }
    res.json(result)
  }),
)

router.post(
  "/folders",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { name, parentId } = req.body
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Folder name required" })
      return
    }

    const [folder] = await db
      .insert(fileFolders)
      .values({ userId: req.user!.userId, name: name.trim(), parentId: parentId || null })
      .returning()

    res.status(201).json(folder)
  }),
)

router.put(
  "/folders/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { name } = req.body
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Folder name required" })
      return
    }

    const [folder] = await db
      .update(fileFolders)
      .set({ name: name.trim() })
      .where(and(eq(fileFolders.id, req.params.id as string), eq(fileFolders.userId, req.user!.userId)))
      .returning()

    if (!folder) {
      res.status(404).json({ error: "Folder not found" })
      return
    }
    res.json(folder)
  }),
)

router.delete(
  "/folders/:id",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const [deleted] = await db
      .delete(fileFolders)
      .where(and(eq(fileFolders.id, req.params.id as string), eq(fileFolders.userId, req.user!.userId)))
      .returning()

    if (!deleted) {
      res.status(404).json({ error: "Folder not found" })
      return
    }
    res.json({ message: "Folder deleted" })
  }),
)

// --- Folder Members (Permissions) ---

router.get(
  "/folders/:id/members",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const members = await db
      .select({
        userId: fileFolderMembers.userId,
        permission: fileFolderMembers.permission,
        createdAt: fileFolderMembers.createdAt,
      })
      .from(fileFolderMembers)
      .where(eq(fileFolderMembers.folderId, req.params.id as string))

    res.json(members)
  }),
)

router.post(
  "/folders/:id/members",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { userId, permission } = req.body
    if (!userId) {
      res.status(400).json({ error: "userId required" })
      return
    }

    await db
      .insert(fileFolderMembers)
      .values({ folderId: req.params.id as string, userId, permission: permission || "read" })
      .onConflictDoNothing()

    res.status(201).json({ message: "Member added" })
  }),
)

router.delete(
  "/folders/:folderId/members/:userId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    await db
      .delete(fileFolderMembers)
      .where(
        and(
          eq(fileFolderMembers.folderId, req.params.folderId as string),
          eq(fileFolderMembers.userId, req.params.userId as string),
        ),
      )

    res.json({ message: "Member removed" })
  }),
)

// --- File Permissions ---

router.get(
  "/permissions/:fileId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const perms = await db
      .select()
      .from(filePermissions)
      .where(eq(filePermissions.fileId, req.params.fileId as string))

    res.json(perms)
  }),
)

router.post(
  "/permissions/:fileId",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const { userId, permission } = req.body
    if (!userId) {
      res.status(400).json({ error: "userId required" })
      return
    }

    await db
      .insert(filePermissions)
      .values({ fileId: req.params.fileId as string, userId, permission: permission || "read" })
      .onConflictDoNothing()

    res.status(201).json({ message: "Permission added" })
  }),
)

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
      )

    res.json({ message: "Permission removed" })
  }),
)

// --- File listing (my files + shared with me) ---

router.get(
  "/",
  authGuard,
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const folderId = req.query.folderId as string | undefined

    let query = db
      .select({
        id: attachments.id,
        url: attachments.url,
        filename: attachments.filename,
        mimeType: attachments.mimeType,
        size: attachments.size,
        createdAt: attachments.createdAt,
        messageId: attachments.messageId,
      })
      .from(attachments)

    if (folderId) {
      query = query.where(eq(attachments.messageId, folderId as any))
    }

    const files = await query.orderBy(attachments.id).limit(100)
    res.json(files)
  }),
)

export default router
