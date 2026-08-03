import { type Request, type Response, type NextFunction } from "express"
import { AppError } from "../lib/app-error.js"
import { logger } from "../lib/logger.js"
import multer from "multer"

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

export function catchAsync(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    logger.warn({ err }, "File too large")
    res.status(413).json({ error: "FILE_TOO_LARGE", message: "File exceeds the maximum allowed size" })
    return
  }

  if (err instanceof AppError) {
    logger.warn({ statusCode: err.statusCode, code: err.code, message: err.message }, "AppError")
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  if (err instanceof SyntaxError && "body" in err) {
    logger.warn({ err }, "Invalid JSON body")
    res.status(400).json({ error: "PARSE_ERROR", message: "Invalid JSON body" })
    return
  }

  logger.error({ err }, "Unhandled error")
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Internal server error" })
}
