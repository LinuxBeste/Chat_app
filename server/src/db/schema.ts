import { pgTable, uuid, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core"

export const conversationTypeEnum = pgEnum("conversation_type", ["dm", "group", "channel"])
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "file"])
export const friendStatusEnum = pgEnum("friend_status", ["pending", "accepted", "blocked"])
export const userStatusEnum = pgEnum("user_status", ["online", "away", "busy", "offline"])

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  status: userStatusEnum("status").default("offline").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: conversationTypeEnum("type").notNull(),
  name: text("name"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const participants = pgTable("participants", {
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: messageTypeEnum("type").default("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
})

export const friends = pgTable("friends", {
  userId: uuid("user_id").references(() => users.id).notNull(),
  friendId: uuid("friend_id").references(() => users.id).notNull(),
  status: friendStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id).notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  filename: text("filename").notNull(),
})

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
