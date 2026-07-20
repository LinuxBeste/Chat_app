import { Request, Response, NextFunction } from "express"
import { verifyToken, TokenPayload } from "../lib/jwt.js"

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" })
    return
  }

  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
