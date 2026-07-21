import { Request, Response, NextFunction } from "express"
import { verifyToken, type TokenPayload } from "../lib/jwt.js"
import { db } from "../lib/db.js"
import { refreshTokens } from "../db/schema.js"
import { eq } from "drizzle-orm"

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers["x-api-key"] as string | undefined
    if (apiKey) {
      const token = await db.select().from(refreshTokens).where(eq(refreshTokens.token, apiKey)).limit(1)
      if (!token.length || token[0].expiresAt < new Date()) {
        res.status(401).json({ error: "Invalid or expired API key" })
        return
      }
      req.user = { userId: token[0].userId, username: "" }
      next()
      return
    }

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
  } catch (err) {
    console.error("Auth middleware error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}
