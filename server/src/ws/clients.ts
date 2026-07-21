import { WebSocket } from "ws"
import { db } from "../lib/db.js"
import { participants } from "../db/schema.js"
import { eq } from "drizzle-orm"

const clients = new Map<string, Set<WebSocket>>()

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

async function sendToConversation(conversationId: string, event: object, excludeUserId?: string) {
  const convParticipants = await db
    .select({ userId: participants.userId })
    .from(participants)
    .where(eq(participants.conversationId, conversationId))

  const message = JSON.stringify(event)
  for (const p of convParticipants) {
    if (excludeUserId && p.userId === excludeUserId) continue
    const sockets = clients.get(p.userId)
    if (!sockets) continue
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }
}

export { clients, sendToUser, broadcast, sendToConversation }
