import { db } from "../lib/db.js"
import { messages, participants, users } from "../db/schema.js"
import { eq, and, sql } from "drizzle-orm"
import { getRedis } from "../lib/redis.js"
import { WebSocket } from "ws"
import { createContextLogger } from "../lib/logger.js"
import { sendToConversation } from "./clients.js"

const log = createContextLogger("ws:messages")

interface SendMessagePayload {
  type: "message:send"
  conversationId: string
  content: string
  messageType?: "text" | "image" | "file"
}

interface EditMessagePayload {
  type: "message:edit"
  messageId: string
  conversationId: string
  content: string
}

interface DeleteMessagePayload {
  type: "message:delete"
  messageId: string
  conversationId: string
}

interface TypingPayload {
  type: "message:typing"
  conversationId: string
}

export async function handleSendMessage(ws: WebSocket, payload: SendMessagePayload, userId: string, _username: string) {
  try {
    const isMember = await db
      .select()
      .from(participants)
      .where(and(eq(participants.conversationId, payload.conversationId), eq(participants.userId, userId)))
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

    // Confirm to sender, then deliver to other participants
    ws.send(JSON.stringify(event))
    sendToConversation(payload.conversationId, event, userId)
    log.info({ conversationId: payload.conversationId, messageType: msg.type }, "Message sent")
  } catch (err) {
    log.error({ err, conversationId: payload.conversationId }, "Send message failed")
    ws.send(JSON.stringify({ type: "error", error: "Failed to send message" }))
  }
}

export async function handleTyping(_ws: WebSocket, payload: TypingPayload, userId: string) {
  const event = { type: "message:typing" as const, conversationId: payload.conversationId, userId }
  const redis = getRedis()
  if (redis) {
    redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event))
  }
  sendToConversation(payload.conversationId, event, userId)
}

export async function handleEditMessage(ws: WebSocket, payload: EditMessagePayload, userId: string) {
  try {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, payload.messageId), eq(messages.conversationId, payload.conversationId)))
      .limit(1)

    if (!msg) {
      ws.send(JSON.stringify({ type: "error", error: "Message not found" }))
      return
    }
    if (msg.senderId !== userId) {
      ws.send(JSON.stringify({ type: "error", error: "Not your message" }))
      return
    }
    if (msg.deletedAt) {
      ws.send(JSON.stringify({ type: "error", error: "Cannot edit deleted message" }))
      return
    }

    const [updated] = await db
      .update(messages)
      .set({ content: payload.content, editedAt: new Date() })
      .where(eq(messages.id, payload.messageId))
      .returning()

    const event = {
      type: "message:edited",
      id: updated.id,
      conversationId: updated.conversationId,
      content: updated.content,
      editedAt: updated.editedAt,
      sender: { id: userId },
    }

    const redis = getRedis()
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event))
    }

    ws.send(JSON.stringify(event))
    sendToConversation(payload.conversationId, event, userId)
    log.info({ messageId: payload.messageId }, "Message edited")
  } catch (err) {
    log.error({ err, messageId: payload.messageId }, "Edit message failed")
    ws.send(JSON.stringify({ type: "error", error: "Failed to edit message" }))
  }
}

export async function handleDeleteMessage(ws: WebSocket, payload: DeleteMessagePayload, userId: string) {
  try {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, payload.messageId), eq(messages.conversationId, payload.conversationId)))
      .limit(1)

    if (!msg) {
      ws.send(JSON.stringify({ type: "error", error: "Message not found" }))
      return
    }
    if (msg.senderId !== userId) {
      ws.send(JSON.stringify({ type: "error", error: "Not your message" }))
      return
    }
    if (msg.deletedAt) {
      ws.send(JSON.stringify({ type: "error", error: "Message already deleted" }))
      return
    }

    await db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, payload.messageId))

    const event = {
      type: "message:deleted",
      id: payload.messageId,
      conversationId: payload.conversationId,
    }

    const redis = getRedis()
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event))
    }

    ws.send(JSON.stringify(event))
    sendToConversation(payload.conversationId, event, userId)
    log.info({ messageId: payload.messageId }, "Message deleted")
  } catch (err) {
    log.error({ err, messageId: payload.messageId }, "Delete message failed")
    ws.send(JSON.stringify({ type: "error", error: "Failed to delete message" }))
  }
}
