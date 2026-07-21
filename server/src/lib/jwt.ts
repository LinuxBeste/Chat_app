import jwt from "jsonwebtoken"
import { config } from "../config.js"

export interface TokenPayload {
  userId: string
  username: string
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessTtl } as any)
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshTtl } as any)
}

export function signSessionToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, purpose: "2fa" }, config.jwt.secret, { expiresIn: "5m" } as any)
}

export function verifyToken(token: string): TokenPayload & { purpose?: string } {
  return jwt.verify(token, config.jwt.secret) as TokenPayload & { purpose?: string }
}
