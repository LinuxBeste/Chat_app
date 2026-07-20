import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage as HttpMessage } from "http"
import { verifyToken } from "../lib/jwt.js"
import { config } from "../config.js"
import { handleSendMessage, handleTyping } from "./messages.js"
import { updatePresence } from "./presence.js"
import { getRedis } from "../lib/redis.js"

const clients = new Map<string, Set<WebSocket>>()

export interface IncomingMessage {
  type: string
  [key: string]: unknown
}

function authenticate(req: HttpMessage): { userId: string; username: string } | null {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
  const token = url.searchParams.get("token")

  if (!token) return null

  try {
    return verifyToken(token)
  } catch {
    return null
  }
}

export function createWSServer(server: import("http").Server) {
  const wss = new WebSocketServer({ server })

  const redis = getRedis()
  if (redis) {
    redis.subscribe("chat:presence", (err) => {
      if (err) console.error("Redis subscribe error:", err)
    })

    redis.on("message", (_channel, message) => {
      try {
        const event = JSON.parse(message)
        if (event.type === "presence:update") {
          broadcast(event)
        }
      } catch { /* ignore malformed */ }
    })
  }

  wss.on("connection", (ws: WebSocket, req: HttpMessage) => {
    const user = authenticate(req)
    if (!user) {
      ws.send(JSON.stringify({ type: "error", error: "Authentication required" }))
      ws.close()
      return
    }

    if (!clients.has(user.userId)) {
      clients.set(user.userId, new Set())
    }
    clients.get(user.userId)!.add(ws)

    updatePresence(user.userId, "online")
    broadcast({ type: "presence:update", userId: user.userId, status: "online" })

    ws.send(JSON.stringify({ type: "connected", userId: user.userId }))

    ws.on("message", async (data) => {
      try {
        const msg: IncomingMessage = JSON.parse(data.toString())

        switch (msg.type) {
          case "message:send":
            await handleSendMessage(ws, msg as any, user.userId, user.username)
            break
          case "message:typing":
            await handleTyping(ws, msg as any, user.userId)
            break
          case "presence:status":
            await updatePresence(user.userId, (msg as any).status)
            broadcast({ type: "presence:update", userId: user.userId, status: (msg as any).status })
            break
          default:
            ws.send(JSON.stringify({ type: "error", error: `Unknown message type: ${msg.type}` }))
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "Invalid message format" }))
      }
    })

    ws.on("close", () => {
      const userSockets = clients.get(user.userId)
      if (userSockets) {
        userSockets.delete(ws)
        if (userSockets.size === 0) {
          clients.delete(user.userId)
          updatePresence(user.userId, "offline")
          broadcast({ type: "presence:update", userId: user.userId, status: "offline" })
        }
      }
    })

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()
      }
    }, config.ws.heartbeatInterval)

    ws.on("close", () => clearInterval(interval))
  })

  return wss
}

function broadcast(event: object) {
  const message = JSON.stringify(event)
  for (const sockets of clients.values()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }
}
