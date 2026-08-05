import { unlink } from "fs/promises";
import { join, basename } from "path";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { attachments, messages } from "../db/schema.js";
import { config } from "../config.js";

/**
 * Deletes a message together with any attachments that reference it, and
 * removes the uploaded files from disk. Without this the attachments FK
 * (attachments.message_id -> messages.id) blocks the delete with a violation.
 */
export async function deleteMessageWithAttachments(messageId: string): Promise<void> {
  const rows = await db.select().from(attachments).where(eq(attachments.messageId, messageId));
  if (rows.length > 0) {
    await db.delete(attachments).where(eq(attachments.messageId, messageId));
    for (const row of rows) {
      try {
        if (!row.url) continue;
        const name = basename(row.url);
        if (name) await unlink(join(config.uploads.dir, name));
      } catch {
        // File already missing or not deletable; row cleanup is what matters.
      }
    }
  }
  await db.delete(messages).where(eq(messages.id, messageId));
}
