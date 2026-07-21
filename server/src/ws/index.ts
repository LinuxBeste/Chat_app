import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage as HttpMessage } from "http"
import { verifyToken } from "../lib/jwt.js"
import { config } from "../config.js"
import { handleSendMessage, handleTyping } from "./messages.js"
import { updatePresence } from "./presence.js"
import { handleCallOffer, handleCallAnswer, handleCallIceCandidate, handleCallEnd } from "./calls.js"
import { getRedis } from "../lib/redis.js"
import { createContextLogger } from "../lib/logger.js"

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

  const wsLogger = createContextLogger("ws")
  const redis = getRedis()
  if (redis) {
    wsLogger.info("Redis pub/sub enabled")
    redis.subscribe("chat:presence", "chat:user:*", (err) => {
      if (err) wsLogger.error({ err }, "Redis subscribe error")
    })

    redis.on("message", (_channel, message) => {
      try {
        const event = JSON.parse(message)
        if (event.type === "presence:update") {
          broadcast(event)
        }
        if (["call:offer", "call:answer", "call:ice-candidate"].includes(event.type)) {
          const userId = event.callerId ?? event.userId
          if (userId) sendToUser(userId, event)
        }
      } catch (redisErr) {
        wsLogger.error({ redisErr }, "Redis message handler error")
      }
    })
  } else {
    wsLogger.warn("Redis not available, running without pub/sub")
  }

  wss.on("connection", (ws: WebSocket, req: HttpMessage) => {
    let authenticated = false
    try {
      const user = authenticate(req)
      if (!user) {
        ws.send(JSON.stringify({ type: "error", error: "Authentication required" }))
        ws.close()
        return
      }

      authenticated = true

      if (!clients.has(user.userId)) {
        clients.set(user.userId, new Set())
      }
      clients.get(user.userId)!.add(ws)

      wsLogger.info({ userId: user.userId }, "WS connected")

      updatePresence(user.userId, "online")
      broadcast({ type: "presence:update", userId: user.userId, status: "online" })

      ws.send(JSON.stringify({ type: "connected", userId: user.userId }))

      ws.on("message", async (data) => {
        try {
          const msg: IncomingMessage = JSON.parse(data.toString())
          wsLogger.debug({ userId: user.userId, type: msg.type }, "WS message received")

          switch (msg.type) {
            case "message:send":
              await handleSendMessage(ws, msg as any, user.userId, user.username)
              break
            case "message:typing":
              await handleTyping(ws, msg as any, user.userId)
              break
            case "presence:status": {
              const status = (msg as any).status
              wsLogger.debug({ userId: user.userId, status }, "Presence update")
              await updatePresence(user.userId, status)
              broadcast({ type: "presence:update", userId: user.userId, status })
              break
            }
            case "call:offer": {
              wsLogger.info({ userId: user.userId }, "Call offer")
              const evt = await handleCallOffer(msg as any, user.userId)
              if (evt) ws.send(JSON.stringify(evt))
              break
            }
            case "call:answer": {
              wsLogger.info({ userId: user.userId }, "Call answer")
              const evt = await handleCallAnswer(msg as any, user.userId)
              if (evt) ws.send(JSON.stringify(evt))
              break
            }
            case "call:ice-candidate": {
              const evt = await handleCallIceCandidate(msg as any, user.userId)
              if (evt) ws.send(JSON.stringify(evt))
              break
            }
            case "call:end": {
              wsLogger.info({ userId: user.userId }, "Call ended")
              const evt = handleCallEnd(msg as any, user.userId)
              if (evt) ws.send(JSON.stringify(evt))
              break
            }
            default:
              wsLogger.warn({ userId: user.userId, type: msg.type }, "Unknown WS message type")
              ws.send(JSON.stringify({ type: "error", error: `Unknown message type: ${msg.type}` }))
          }
        } catch (parseErr) {
          wsLogger.error({ parseErr }, "Invalid WS message format")
          ws.send(JSON.stringify({ type: "error", error: "Invalid message format" }))
        }
      })

      ws.on("close", () => {
        const userSockets = clients.get(user.userId)
        if (userSockets) {
          userSockets.delete(ws)
          if (userSockets.size === 0) {
            clients.delete(user.userId)
            wsLogger.info({ userId: user.userId }, "WS disconnected")
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
    } catch (err) {
      wsLogger.error({ err }, "WS connection error")
      if (!authenticated) {
        ws.close(1011, "Internal server error")
      }
    }
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

function sendToUser(userId: string, event: object) {
  const sockets = clients.get(userId)
  if (!sockets) return
  const message = JSON.stringify(event)
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  }
}
