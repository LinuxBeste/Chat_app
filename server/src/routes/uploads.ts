import { Router, Request, Response } from "express"
import type { Router as RouterType } from "express"
import multer from "multer"
import { existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { authGuard } from "../middleware/auth.js"
import { config } from "../config.js"

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

router.post("/", authGuard, upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" })
    return
  }

  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  })
})

export default router
