import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import multer from "multer"
import { existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { authGuard } from "../middleware/auth.js"
import { catchAsync } from "../middleware/error-handler.js"
import { config } from "../config.js"
import { db } from "../lib/db.js"
import { attachments } from "../db/schema.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, "..", "..", config.uploads.dir)

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSize },
})

const router: RouterType = Router()

router.post(
  "/",
  authGuard,
  upload.single("file"),
  catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" })
      return
    }

    const url = `/uploads/${req.file.filename}`
    const [attachment] = await db
      .insert(attachments)
      .values({
        url,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      })
      .returning()

    res.status(201).json({
      id: attachment.id,
      url,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      folderId: null,
      createdAt: attachment.createdAt,
    })
  }),
)

export default router
