import { pgTable, uuid, text, timestamp, pgEnum, integer, index, uniqueIndex } from "drizzle-orm/pg-core"

export const conversationTypeEnum = pgEnum("conversation_type", ["dm", "group", "channel"])
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "file"])
export const friendStatusEnum = pgEnum("friend_status", ["pending", "accepted", "blocked"])
export const userStatusEnum = pgEnum("user_status", ["online", "away", "busy", "offline"])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").unique().notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    avatar: text("avatar"),
    bio: text("bio"),
    customStatus: text("custom_status"),
    status: userStatusEnum("status").default("offline").notNull(),
    emailVerified: text("email_verified").default("false").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    displayNameIdx: index("users_display_name_idx").on(table.displayName),
  }),
)

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: conversationTypeEnum("type").notNull(),
    name: text("name"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index("conversations_created_by_idx").on(table.createdBy),
  }),
)

export const participants = pgTable(
  "participants",
  {
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    convUserUnique: uniqueIndex("participants_conv_user_idx").on(table.conversationId, table.userId),
  }),
)

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    senderId: uuid("sender_id")
      .references(() => users.id)
      .notNull(),
    content: text("content").notNull(),
    type: messageTypeEnum("type").default("text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
    senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  }),
)

export const friends = pgTable(
  "friends",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    friendId: uuid("friend_id")
      .references(() => users.id)
      .notNull(),
    status: friendStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userFriendUnique: uniqueIndex("friends_user_friend_idx").on(table.userId, table.friendId),
    friendIdIdx: index("friends_friend_id_idx").on(table.friendId),
    statusIdx: index("friends_status_idx").on(table.status),
  }),
)

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .references(() => messages.id)
      .notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    filename: text("filename").notNull(),
  },
  (table) => ({
    messageIdIdx: index("attachments_message_id_idx").on(table.messageId),
  }),
)

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    token: text("token").unique().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
  }),
)

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    token: text("token").unique().notNull(),
    type: text("type").notNull().default("email_verify"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("email_verification_tokens_user_id_idx").on(table.userId),
    tokenIdx: index("email_verification_tokens_token_idx").on(table.token),
  }),
)

export const blocks = pgTable(
  "blocks",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    blockedUserId: uuid("blocked_user_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userBlockedUnique: uniqueIndex("blocks_user_blocked_idx").on(table.userId, table.blockedUserId),
  }),
)

export const messageReads = pgTable(
  "message_reads",
  {
    messageId: uuid("message_id")
      .references(() => messages.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (table) => ({
    msgUserUnique: uniqueIndex("message_reads_msg_user_idx").on(table.messageId, table.userId),
  }),
)

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportedBy: uuid("reported_by")
      .references(() => users.id)
      .notNull(),
    targetUserId: uuid("target_user_id").references(() => users.id),
    targetMessageId: uuid("target_message_id").references(() => messages.id),
    reason: text("reason").notNull(),
    status: text("status").default("open").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    reportedByIdx: index("reports_reported_by_idx").on(table.reportedBy),
    targetUserIdIdx: index("reports_target_user_id_idx").on(table.targetUserId),
  }),
)

export const bans = pgTable(
  "bans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    bannedBy: uuid("banned_by")
      .references(() => users.id)
      .notNull(),
    reason: text("reason"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    convUserUnique: uniqueIndex("bans_conv_user_idx").on(table.conversationId, table.userId),
    userIdIdx: index("bans_user_id_idx").on(table.userId),
  }),
)

export const mutes = pgTable(
  "mutes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    convUserUnique: uniqueIndex("mutes_conv_user_idx").on(table.conversationId, table.userId),
    userIdIdx: index("mutes_user_id_idx").on(table.userId),
  }),
)

export const pinnedMessages = pgTable(
  "pinned_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    messageId: uuid("message_id")
      .references(() => messages.id)
      .notNull(),
    pinnedBy: uuid("pinned_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    convMsgUnique: uniqueIndex("pinned_messages_conv_msg_idx").on(table.conversationId, table.messageId),
    pinnedByIdx: index("pinned_messages_pinned_by_idx").on(table.pinnedBy),
  }),
)

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    url: text("url").notNull(),
    events: text("events").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("webhooks_user_id_idx").on(table.userId),
  }),
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    data: text("data"),
    isRead: text("is_read").default("false").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  }),
)

export const totpSecrets = pgTable("totp_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  secret: text("secret").notNull(),
  verified: text("verified").default("false").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const loginHistory = pgTable(
  "login_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    success: text("success").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("login_history_user_id_idx").on(table.userId),
    createdAtIdx: index("login_history_created_at_idx").on(table.createdAt),
  }),
)

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("events_conversation_id_idx").on(table.conversationId),
  }),
)

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    eventId: uuid("event_id")
      .references(() => events.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    eventUserUnique: uniqueIndex("event_rsvps_event_user_idx").on(table.eventId, table.userId),
    userIdIdx: index("event_rsvps_user_id_idx").on(table.userId),
  }),
)

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdIdx: index("communities_owner_id_idx").on(table.ownerId),
  }),
)

export const communityMembers = pgTable(
  "community_members",
  {
    communityId: uuid("community_id")
      .references(() => communities.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    communityUserUnique: uniqueIndex("community_members_community_user_idx").on(table.communityId, table.userId),
    userIdIdx: index("community_members_user_id_idx").on(table.userId),
  }),
)

export const communityChannels = pgTable(
  "community_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id)
      .notNull(),
    name: text("name").notNull(),
    topic: text("topic"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    communityIdIdx: index("community_channels_community_id_idx").on(table.communityId),
  }),
)

export const communityInvites = pgTable(
  "community_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id)
      .notNull(),
    code: text("code").unique().notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").default(0).notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    communityIdIdx: index("community_invites_community_id_idx").on(table.communityId),
  }),
)

export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull()
      .unique(),
    preferences: text("preferences").notNull().default("{}"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_preferences_user_id_idx").on(table.userId),
  }),
)

export const userThemes = pgTable(
  "user_themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    theme: text("theme").notNull(),
    isActive: text("is_active").default("false").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_themes_user_id_idx").on(table.userId),
  }),
)

export const fileFolders = pgTable(
  "file_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("file_folders_user_id_idx").on(table.userId),
    parentIdIdx: index("file_folders_parent_id_idx").on(table.parentId),
  }),
)

export const fileFolderMembers = pgTable(
  "file_folder_members",
  {
    folderId: uuid("folder_id")
      .references(() => fileFolders.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    permission: text("permission").default("read").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    folderUserUnique: uniqueIndex("file_folder_members_folder_user_idx").on(table.folderId, table.userId),
    userIdIdx: index("file_folder_members_user_id_idx").on(table.userId),
  }),
)

export const filePermissions = pgTable(
  "file_permissions",
  {
    fileId: uuid("file_id")
      .references(() => attachments.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    permission: text("permission").default("read").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fileUserUnique: uniqueIndex("file_permissions_file_user_idx").on(table.fileId, table.userId),
    userIdIdx: index("file_permissions_user_id_idx").on(table.userId),
  }),
)

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    callerId: uuid("caller_id")
      .references(() => users.id)
      .notNull(),
    calleeId: uuid("callee_id")
      .references(() => users.id)
      .notNull(),
    status: text("status").notNull().default("ended"),
    duration: integer("duration"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    callerIdIdx: index("calls_caller_id_idx").on(table.callerId),
    calleeIdIdx: index("calls_callee_id_idx").on(table.calleeId),
  }),
)
