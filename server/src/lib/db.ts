import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { config } from "../config.js"
import * as schema from "../db/schema.js"
import { logger } from "./logger.js"

const pool = new Pool({
  connectionString: config.db.url,
  max: config.db.poolMax,
})

export const db = drizzle(pool, { schema })

export async function testConnection() {
  const client = await pool.connect()
  try {
    await client.query("SELECT 1")
    logger.info({ dbUrl: config.db.url?.replace(/\/\/.*@/, "//***@") }, "Database connected")
  } finally {
    client.release()
  }
}
