import { eq, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { hashPassword } from "../lib/password.js";
import { users, conversations, participants, messages, friends } from "../db/schema.js";

const DEMO_USERS = [
  { username: "demo", email: "demo@example.com", password: "demo1234", displayName: "Demo User" },
  { username: "alice", email: "alice@example.com", password: "alice1234", displayName: "Alice" },
  { username: "bob", email: "bob@example.com", password: "bob1234", displayName: "Bob" },
];

const SEED_MESSAGES = [
  "Welcome to the chat app! This is a demo conversation.",
  "Feel free to explore all the features.",
  "Reactions, replies and pins are supported.",
];

async function main() {
  console.log("Seeding demo data ...");

  const created = new Map<string, string>();
  for (const u of DEMO_USERS) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1);
    if (existing) {
      created.set(u.username, existing.id);
      continue;
    }
    const [row] = await db
      .insert(users)
      .values({
        username: u.username,
        email: u.email,
        passwordHash: await hashPassword(u.password),
        displayName: u.displayName,
      })
      .returning({ id: users.id });
    created.set(u.username, row.id);
    console.log(`  user ${u.username} created`);
  }

  const demoId = created.get("demo")!;
  const aliceId = created.get("alice")!;
  const bobId = created.get("bob")!;

  const [existingConv] = await db
    .select({ id: conversations.id })
    .from(participants)
    .innerJoin(conversations, eq(participants.conversationId, conversations.id))
    .where(and(eq(participants.userId, demoId), eq(conversations.type, "dm")))
    .limit(1);

  if (!existingConv) {
    const [conv] = await db.insert(conversations).values({ type: "dm", createdBy: demoId }).returning();
    await db.insert(participants).values([
      { conversationId: conv.id, userId: demoId },
      { conversationId: conv.id, userId: aliceId },
      { conversationId: conv.id, userId: bobId },
    ]);
    const now = Date.now();
    for (let i = 0; i < SEED_MESSAGES.length; i++) {
      await db
        .insert(messages)
        .values({
          conversationId: conv.id,
          senderId: [demoId, aliceId, bobId][i % 3],
          content: SEED_MESSAGES[i],
          type: "text",
          createdAt: new Date(now - (SEED_MESSAGES.length - i) * 60_000),
        })
        .returning();
    }
    console.log("  demo conversation + messages created");
  }

  for (const [a, b] of [
    [demoId, aliceId],
    [demoId, bobId],
  ] as const) {
    const [existingFriend] = await db
      .select({ id: friends.userId })
      .from(friends)
      .where(and(eq(friends.userId, a), eq(friends.friendId, b)))
      .limit(1);
    if (!existingFriend) {
      await db.insert(friends).values({ userId: a, friendId: b, status: "accepted" });
      console.log("  friend link created");
    }
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
