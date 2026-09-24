/**
 * Shared connection setup for the one-off migration scripts.
 *
 * Secrets come from .env.migrate in the repo root (git-ignored) or the shell.
 * OLD_DB_URL / NEW_DB_URL may hold either a full postgres:// connection string
 * or JUST the database password: then the Supabase pooler address is built
 * from the project ref and region, trying each known pooler host until one
 * connects. Nothing secret is ever printed.
 */
import { existsSync } from "node:fs";
import pg from "pg";

const ENV_FILE = new URL("../.env.migrate", import.meta.url);
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export const PROJECTS = {
  OLD: { ref: "pfagkivkytrvbkhsulvo", region: "us-east-2", label: "OrbitStack" },
  NEW: { ref: "gncqfzxckjgqslreocti", region: "us-west-2", label: "BuildTag" },
};

function candidates(which, value) {
  if (/^postgres(ql)?:\/\//.test(value)) return [{ url: value, host: "your connection string" }];
  const { ref, region } = PROJECTS[which];
  const pw = encodeURIComponent(value);
  return [
    ...["aws-0", "aws-1"].map((p) => ({ url: `postgresql://postgres.${ref}:${pw}@${p}-${region}.pooler.supabase.com:5432/postgres`, host: `${p}-${region} session pooler` })),
    { url: `postgresql://postgres:${pw}@db.${ref}.supabase.co:5432/postgres`, host: "direct connection" },
  ];
}

/** Resolves OLD_/NEW_ database access to a working connection string. */
export async function resolveDbUrl(which) {
  const key = `${which}_DB_URL`;
  const value = (process.env[key] ?? "").trim();
  if (!value) {
    console.error(`${key} is empty. Put the ${PROJECTS[which].label} database password (or full connection string) after ${key}= in .env.migrate and save.`);
    process.exit(1);
  }
  let lastError = "";
  for (const c of candidates(which, value)) {
    const client = new pg.Client({ connectionString: c.url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      console.log(`${PROJECTS[which].label}: connected via ${c.host}.`);
      return c.url;
    } catch (err) {
      lastError = err.message;
      await client.end().catch(() => {});
      if (/password authentication failed/i.test(lastError)) break;
    }
  }
  console.error(
    /password authentication failed/i.test(lastError)
      ? `${PROJECTS[which].label}: wrong database password. Reset it in Supabase (Project Settings > Database) if needed.`
      : `${PROJECTS[which].label}: could not connect (${lastError}). Paste the "Session pooler" connection string from the Connect button instead.`,
  );
  process.exit(1);
}
