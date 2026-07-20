import { type Request, type Response, type NextFunction } from "express"
import { AppError } from "../lib/app-error.js"

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

export function catchAsync(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "PARSE_ERROR", message: "Invalid JSON body" })
    return
  }

  console.error("[unhandled error]", err)
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Internal server error" })
}
