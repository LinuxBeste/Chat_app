import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../lib/db.js";

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

async function main() {
  console.log(`Running migrations from ${migrationsFolder} ...`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
