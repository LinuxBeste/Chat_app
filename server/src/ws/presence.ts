import { db } from "../lib/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getRedis } from "../lib/redis.js";

export async function updatePresence(userId: string, status: "online" | "away" | "busy" | "offline") {
  await db.update(users).set({ status }).where(eq(users.id, userId));

  const redis = getRedis();
  if (redis) {
    redis.publish("chat:presence", JSON.stringify({ type: "presence:update", userId, status }));
  }
}

export async function getPresence(userId: string): Promise<string> {
  try {
    const [user] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    return user?.status ?? "offline";
  } catch {
    return "offline";
  }
}
