/**
 * Runs a .sql file against the BuildTag project (NEW_DB_URL from .env.migrate).
 *   node scripts/run-sql.mjs supabase/seed/demo_blackline_road_glide.sql
 */
import { readFileSync } from "node:fs";
import pg from "pg";

import { resolveDbUrl } from "./db-env.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}
const client = new pg.Client({ connectionString: await resolveDbUrl("NEW"), ssl: { rejectUnauthorized: false } });
await client.connect();
client.on("notice", (n) => console.log("notice:", n.message));
try {
  await client.query(readFileSync(file, "utf8"));
  console.log(`ran ${file}`);
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
