/**
 * Checks the database passwords in .env.migrate without printing them.
 * Accepts a password on OLD_DB_URL= / NEW_DB_URL= or typed into the comment
 * line at the top. Moves a working password onto the right line, leaves
 * anything that fails where it is, and retries for ~2 minutes because a
 * freshly reset password takes a moment to reach the Supabase pooler.
 *
 *   node scripts/check-db-passwords.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const path = new URL("../.env.migrate", import.meta.url);
const lines = readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/);
const PRE = "# with your database password in place of ";
const PROJ = { OLD: ["pfagkivkytrvbkhsulvo", "us-east-2", "OrbitStack"], NEW: ["gncqfzxckjgqslreocti", "us-west-2", "BuildTag"] };

const get = (k) => (lines.find((l) => l.startsWith(`${k}_DB_URL=`)) ?? "").slice(`${k}_DB_URL=`.length).trim();
const ci = lines.findIndex((l) => l.startsWith(PRE));
const fromComment = ci >= 0 ? lines[ci].slice(PRE.length).trim() : "";
const commentPw = fromComment && !fromComment.startsWith("[YOUR-PASSWORD]") ? fromComment : "";

// candidate passwords per project: its own line first, then whatever is in the comment (with/without a trailing dot)
const cands = (k) => [...new Set([get(k), commentPw, commentPw.replace(/\.$/, "")].filter((v) => v && !v.startsWith("postgres")))];

async function tryPw(ref, region, pw) {
  const hosts = [`aws-0-${region}.pooler.supabase.com`, `aws-1-${region}.pooler.supabase.com`];
  let result = "error";
  for (const h of hosts) {
    const c = new pg.Client({ connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(pw)}@${h}:5432/postgres`, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try { await c.connect(); await c.query("select 1"); await c.end(); return "ok"; }
    catch (e) { await c.end().catch(() => {}); if (/password authentication failed/i.test(e.message)) return "wrong"; result = "error: " + e.message.slice(0, 60); }
  }
  return result;
}

const found = {};
for (let attempt = 1; attempt <= 5; attempt++) {
  for (const [k, [ref, region, label]] of Object.entries(PROJ)) {
    if (found[k]) continue;
    const list = cands(k);
    if (!list.length) { found[k] = null; continue; }
    for (const pw of list) {
      const r = await tryPw(ref, region, pw);
      if (r === "ok") { found[k] = pw; console.log(`${label}: password WORKS (length ${pw.length}).`); break; }
      if (attempt === 1) console.log(`${label}: length ${pw.length} -> ${r === "wrong" ? "wrong password" : r}`);
    }
  }
  if (Object.keys(PROJ).every((k) => found[k] !== undefined && (found[k] || !cands(k).length))) break;
  if (attempt < 5) { console.log(`...not yet, retrying in 30s (a fresh reset can take a minute) [${attempt}/4]`); await new Promise((r) => setTimeout(r, 30000)); }
}

let moved = false;
for (const [k, pw] of Object.entries(found)) {
  if (!pw) continue;
  const j = lines.findIndex((l) => l.startsWith(`${k}_DB_URL=`));
  lines[j] = `${k}_DB_URL=${pw}`;
  if (pw === commentPw || pw === commentPw.replace(/\.$/, "")) moved = true;
}
if (moved) lines[ci] = PRE + "[YOUR-PASSWORD].";
writeFileSync(path, lines.join("\n"));
for (const [k, [, , label]] of Object.entries(PROJ)) if (!found[k]) console.log(`${label}: no working password yet.`);
