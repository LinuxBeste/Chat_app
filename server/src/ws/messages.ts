import { db } from "../lib/db.js";
import { messages, participants, users, attachments, reactions } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { getRedis } from "../lib/redis.js";
import { WebSocket } from "ws";
import { createContextLogger } from "../lib/logger.js";
import { sendToConversation } from "./clients.js";
import { deleteMessageWithAttachments } from "../lib/message-cleanup.js";

const log = createContextLogger("ws:messages");

interface AttachmentPayload {
  id?: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface SendMessagePayload {
  type: "message:send";
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "file";
  encrypted?: boolean | "true" | "false";
  keyId?: string;
  attachment?: AttachmentPayload;
  clientMessageId?: string;
}

interface EditMessagePayload {
  type: "message:edit";
  messageId: string;
  conversationId: string;
  content: string;
}

interface DeleteMessagePayload {
  type: "message:delete";
  messageId: string;
  conversationId: string;
}

interface TypingPayload {
  type: "message:typing";
  conversationId: string;
}

interface ReactionPayload {
  type: "message:reaction";
  messageId: string;
  conversationId: string;
  emoji: string;
}

export async function handleSendMessage(ws: WebSocket, payload: SendMessagePayload, userId: string, _username: string) {
  try {
    const isMember = await db
      .select()
      .from(participants)
      .where(and(eq(participants.conversationId, payload.conversationId), eq(participants.userId, userId)))
      .limit(1);

    if (isMember.length === 0) {
      ws.send(JSON.stringify({ type: "error", error: "Not a member of this conversation" }));
      return;
    }

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: payload.conversationId,
        senderId: userId,
        content: payload.content,
        type: payload.messageType ?? "text",
        encrypted: payload.encrypted === true || payload.encrypted === "true" ? "true" : "false",
        keyId: payload.keyId ?? null,
      })
      .returning();

    const attachment = payload.attachment;
    if (attachment) {
      if (attachment.id) {
        await db
          .update(attachments)
          .set({ messageId: msg.id, conversationId: payload.conversationId })
          .where(eq(attachments.id, attachment.id));
      } else {
        await db.insert(attachments).values({
          messageId: msg.id,
          conversationId: payload.conversationId,
          url: attachment.url,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
        });
      }
    }

    const [user] = await db
      .select({ username: users.username, displayName: users.displayName, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const event: Record<string, unknown> = {
      type: "message:new",
      id: msg.id,
      senderId: userId,
      conversationId: msg.conversationId,
      sender: { id: userId, ...user },
      content: msg.content,
      messageType: msg.type,
      encrypted: msg.encrypted,
      keyId: msg.keyId ?? undefined,
      createdAt: msg.createdAt,
    };
    if (payload.clientMessageId) {
      event.clientMessageId = payload.clientMessageId;
    }
    if (attachment) {
      event.attachment = attachment;
    }

    const redis = getRedis();
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event));
    } else {
      // Without redis pub/sub, deliver directly to connected clients
      sendToConversation(payload.conversationId, event, userId);
    }

    // Confirm to sender
    ws.send(JSON.stringify(event));
    log.info({ conversationId: payload.conversationId, messageType: msg.type }, "Message sent");
  } catch (err) {
    log.error({ err, conversationId: payload.conversationId }, "Send message failed");
    ws.send(JSON.stringify({ type: "error", error: "Failed to send message" }));
  }
}

export async function handleTyping(_ws: WebSocket, payload: TypingPayload, userId: string) {
  const event = { type: "message:typing" as const, conversationId: payload.conversationId, userId };
  const redis = getRedis();
  if (redis) {
    redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event));
  }
  sendToConversation(payload.conversationId, event, userId);
}

export async function handleReaction(ws: WebSocket, payload: ReactionPayload, userId: string) {
  try {
    const isMember = await db
      .select()
      .from(participants)
      .where(and(eq(participants.conversationId, payload.conversationId), eq(participants.userId, userId)))
      .limit(1);
    if (isMember.length === 0) {
      ws.send(JSON.stringify({ type: "error", error: "Not a member of this conversation" }));
      return;
    }
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, payload.messageId), eq(messages.conversationId, payload.conversationId)))
      .limit(1);
    if (!msg) {
      ws.send(JSON.stringify({ type: "error", error: "Message not found" }));
      return;
    }
    const existing = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.messageId, payload.messageId),
          eq(reactions.userId, userId),
          eq(reactions.emoji, payload.emoji),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      await db
        .delete(reactions)
        .where(
          and(
            eq(reactions.messageId, payload.messageId),
            eq(reactions.userId, userId),
            eq(reactions.emoji, payload.emoji),
          ),
        );
    } else {
      await db.insert(reactions).values({ messageId: payload.messageId, userId, emoji: payload.emoji });
    }

    const list = await db
      .select({ emoji: reactions.emoji, userId: reactions.userId, username: users.username })
      .from(reactions)
      .innerJoin(users, eq(users.id, reactions.userId))
      .where(eq(reactions.messageId, payload.messageId));

    const event = {
      type: "message:reaction" as const,
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      reactions: list,
    };
    const redis = getRedis();
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event));
    } else {
      sendToConversation(payload.conversationId, event, userId);
    }
    ws.send(JSON.stringify(event));
    log.info({ messageId: payload.messageId, emoji: payload.emoji, count: list.length }, "Message reaction toggled");
  } catch (err) {
    log.error({ err, messageId: payload.messageId }, "Reaction failed");
    ws.send(JSON.stringify({ type: "error", error: "Failed to react to message" }));
  }
}

export async function handleEditMessage(ws: WebSocket, payload: EditMessagePayload, userId: string) {
  try {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, payload.messageId), eq(messages.conversationId, payload.conversationId)))
      .limit(1);

    if (!msg) {
      ws.send(JSON.stringify({ type: "error", error: "Message not found" }));
      return;
    }
    if (msg.senderId !== userId) {
      ws.send(JSON.stringify({ type: "error", error: "Not your message" }));
      return;
    }
    if (msg.deletedAt) {
      ws.send(JSON.stringify({ type: "error", error: "Cannot edit deleted message" }));
      return;
    }

    const [updated] = await db
      .update(messages)
      .set({ content: payload.content, editedAt: new Date() })
      .where(eq(messages.id, payload.messageId))
      .returning();

    const event = {
      type: "message:edited",
      id: updated.id,
      conversationId: updated.conversationId,
      content: updated.content,
      editedAt: updated.editedAt,
      sender: { id: userId },
    };

    const redis = getRedis();
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event));
    }

    ws.send(JSON.stringify(event));
    sendToConversation(payload.conversationId, event, userId);
    log.info({ messageId: payload.messageId }, "Message edited");
  } catch (err) {
    log.error({ err, messageId: payload.messageId }, "Edit message failed");
    ws.send(JSON.stringify({ type: "error", error: "Failed to edit message" }));
  }
}

export async function handleDeleteMessage(ws: WebSocket, payload: DeleteMessagePayload, userId: string) {
  try {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, payload.messageId), eq(messages.conversationId, payload.conversationId)))
      .limit(1);

    if (!msg) {
      ws.send(JSON.stringify({ type: "error", error: "Message not found" }));
      return;
    }
    if (msg.deletedAt) {
      ws.send(JSON.stringify({ type: "error", error: "Message already deleted" }));
      return;
    }
    if (msg.senderId !== userId) {
      ws.send(JSON.stringify({ type: "error", error: "Not your message" }));
      return;
    }
    await deleteMessageWithAttachments(msg.id);

    const event = {
      type: "message:deleted",
      id: payload.messageId,
      conversationId: payload.conversationId,
    };

    const redis = getRedis();
    if (redis) {
      redis.publish(`chat:conversation:${payload.conversationId}`, JSON.stringify(event));
    }

    ws.send(JSON.stringify(event));
    sendToConversation(payload.conversationId, event, userId);
    log.info({ messageId: payload.messageId }, "Message deleted");
  } catch (err) {
    log.error({ err, messageId: payload.messageId }, "Delete message failed");
    ws.send(JSON.stringify({ type: "error", error: "Failed to delete message" }));
  }
}
