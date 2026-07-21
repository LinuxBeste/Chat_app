import { db } from "../lib/db.js"
import { messages, participants, users } from "../db/schema.js"
import { eq, and } from "drizzle-orm"
import { getRedis } from "../lib/redis.js"
import { WebSocket } from "ws"
import { createContextLogger } from "../lib/logger.js"

const log = createContextLogger("ws:messages")

interface SendMessagePayload {
  type: "message:send"
  conversationId: string
  content: string
  messageType?: "text" | "image" | "file"
}

interface TypingPayload {
  type: "message:typing"
  conversationId: string
}

export async function handleSendMessage(
  ws: WebSocket,
  payload: SendMessagePayload,
  userId: string,
  _username: string,
) {
  try {
    const isMember = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.conversationId, payload.conversationId),
          eq(participants.userId, userId),
        ),
      )
      .limit(1)

    if (isMember.length === 0) {
      ws.send(JSON.stringify({ type: "error", error: "Not a member of this conversation" }))
      return
    }

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: payload.conversationId,
        senderId: userId,
        content: payload.content,
        type: payload.messageType ?? "text",
      })
      .returning()

    const [user] = await db
      .select({ username: users.username, displayName: users.displayName, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const event = {
      type: "message:new",
      id: msg.id,
      conversationId: msg.conversationId,
      sender: { id: userId, ...user },
      content: msg.content,
      messageType: msg.type,
      createdAt: msg.createdAt,
    }

    const redis = getRedis()
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event))
    }

    ws.send(JSON.stringify(event))
    log.info({ conversationId: payload.conversationId, messageType: msg.type }, "Message sent")
  } catch (err) {
    log.error({ err, conversationId: payload.conversationId }, "Send message failed")
    ws.send(JSON.stringify({ type: "error", error: "Failed to send message" }))
  }
}

export async function handleTyping(
  _ws: WebSocket,
  payload: TypingPayload,
  userId: string,
) {
  const redis = getRedis()
  if (redis) {
    redis.publish(
      `chat:conversation:${payload.conversationId}`,
      JSON.stringify({ type: "message:typing", conversationId: payload.conversationId, userId }),
    )
  }
}
