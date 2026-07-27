import sharp from "sharp"
import { join, extname } from "path"
import { existsSync, mkdirSync } from "fs"
import { writeFile } from "fs/promises"
import { v4 as uuid } from "uuid"
import { config } from "../config.js"

export async function resizeImage(input: Buffer, maxWidth = 1920, maxHeight = 1920): Promise<Buffer> {
  const image = sharp(input)
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) return input
  if (metadata.width <= maxWidth && metadata.height <= maxHeight) return input
  return image.resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true }).toBuffer()
}

export async function saveAndResizeImage(input: Buffer, subDir: string, maxDimension = 1920): Promise<string> {
  const uploadDir = join(config.uploads.dir, subDir)
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  const filename = `${Date.now()}-${uuid()}${extname(".jpg")}`
  const filePath = join(uploadDir, filename)

  const resized = await resizeImage(input, maxDimension, maxDimension)
  await writeFile(filePath, resized)

  return `/uploads/${subDir}/${filename}`
}

export async function saveAvatar(input: Buffer): Promise<string> {
  const uploadDir = join(config.uploads.dir, "avatars")
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  const image = sharp(input)
  const metadata = await image.metadata()
  const size = Math.min(metadata.width || 512, metadata.height || 512, 512)
  const resized = await image.resize(size, size, { fit: "cover", position: "center" }).toBuffer()

  const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`
  await writeFile(join(uploadDir, filename), resized)

  return `/uploads/avatars/${filename}`
}

export async function saveAndScaleUpload(
  input: Buffer,
  originalName: string,
): Promise<{ url: string; filename: string; mimeType: string; size: number }> {
  const ext = extname(originalName).toLowerCase()
  const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"].includes(ext)

  let buffer = input
  if (isImage) {
    buffer = await resizeImage(input)
  }

  const uploadDir = config.uploads.dir
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
  await writeFile(join(uploadDir, filename), buffer)

  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
  }

  return {
    url: `/uploads/${filename}`,
    filename: originalName,
    mimeType: mimeMap[ext] || "application/octet-stream",
    size: buffer.length,
  }
}
