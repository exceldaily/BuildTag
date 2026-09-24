/**
 * One-time move of BuildTags from the shared OrbitStack Supabase project to
 * its own project. Copies database rows directly between the two databases
 * and storage files between the two projects. Prints counts only, never row
 * contents, so nothing personal ends up in logs.
 *
 * Run from the repo root in YOUR terminal, with the secrets set only in that
 * shell session (PowerShell shown; values come from each project's
 * Dashboard > Project Settings > Database / API):
 *
 *   $env:OLD_DB_URL = "postgresql://postgres.pfagkivkytrvbkhsulvo:<password>@<pooler-host>:5432/postgres"
 *   $env:NEW_DB_URL = "postgresql://postgres.gncqfzxckjgqslreocti:<password>@<pooler-host>:5432/postgres"
 *   $env:OLD_SUPABASE_URL = "https://pfagkivkytrvbkhsulvo.supabase.co"
 *   $env:OLD_SERVICE_KEY = "<OrbitStack service_role key>"
 *   $env:NEW_SUPABASE_URL = "https://gncqfzxckjgqslreocti.supabase.co"
 *   $env:NEW_SERVICE_KEY = "<BuildTag service_role key>"
 *   node scripts/migrate-project.mjs            # dry run: counts only, writes nothing
 *   node scripts/migrate-project.mjs --apply    # copy
 *
 * Use the "Session pooler" connection strings (port 5432). The target must
 * already have migrations 0000-0013 applied and no BuildTags data yet.
 * Everything database-side happens in ONE transaction on the target: it
 * either all lands or nothing does. Triggers are suspended during the copy
 * (session_replication_role = replica) so counters, QR codes and plan limits
 * are copied exactly instead of being recomputed.
 */
import pg from "pg";
import { resolveDbUrl } from "./db-env.mjs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const OLD_DB_URL = await resolveDbUrl("OLD");
const NEW_DB_URL = await resolveDbUrl("NEW");
if (!/gncqfzxckjgqslreocti/.test(NEW_DB_URL)) {
  console.error("NEW_DB_URL does not point at the BuildTag project (gncqfzxckjgqslreocti). Refusing.");
  process.exit(1);
}

// Copy order respects foreign keys. `where` limits auth rows to BuildTags users.
const BUILDTAG_USERS = "id in (select id from buildtag.profiles)";
const TABLES = [
  { name: "auth.users", where: BUILDTAG_USERS },
  { name: "auth.identities", where: "user_id in (select id from buildtag.profiles)" },
  { name: "buildtag.profiles" },
  { name: "buildtag.admins" },
  { name: "buildtag.subscriptions" },
  { name: "buildtag.shops" },
  { name: "buildtag.parts" },
  { name: "buildtag.vehicles" },
  { name: "buildtag.qr_codes" },
  { name: "buildtag.vehicle_photos" },
  { name: "buildtag.modifications" },
  { name: "buildtag.social_links" },
  { name: "buildtag.tag_designs" },
  { name: "buildtag.crews" },
  { name: "buildtag.crew_members" },
  { name: "buildtag.scan_events" },
  { name: "buildtag.product_clicks" },
  { name: "buildtag.social_clicks" },
  { name: "buildtag.build_likes" },
  { name: "buildtag.reports" },
  { name: "buildtag.print_specifications", upsert: "id" },
  { name: "buildtag.tag_production_snapshots" },
  { name: "buildtag.orders" },
  { name: "buildtag.order_items" },
  { name: "buildtag.order_events" },
  { name: "buildtag.payment_events" },
  { name: "buildtag.notification_events" },
  { name: "buildtag.private_settings", upsert: "key" },
];

const BUCKETS = ["buildtag-avatars", "buildtag-photos", "buildtag-production", "buildtag-proofs", "buildtag-tag-assets"];

async function columnsFor(client, qualified) {
  const [schema, table] = qualified.split(".");
  // Skip generated columns (e.g. auth.users.confirmed_at); identity columns are
  // copied with OVERRIDING SYSTEM VALUE so ids stay stable.
  const { rows } = await client.query(
    `select column_name, is_identity = 'YES' as ident
       from information_schema.columns
      where table_schema = $1 and table_name = $2 and is_generated = 'NEVER'
      order by ordinal_position`,
    [schema, table],
  );
  return rows;
}

async function main() {
  const src = new pg.Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
  const dst = new pg.Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });
  await src.connect();
  await dst.connect();

  const existing = await dst.query("select count(*)::int as n from buildtag.profiles");
  if (existing.rows[0].n > 0) {
    console.error(`Target already has ${existing.rows[0].n} BuildTags profiles. Refusing to copy twice.`);
    process.exit(1);
  }

  console.log(APPLY ? "Copying (single transaction on the target)..." : "Dry run (nothing is written). Row counts:");
  // Tables whose triggers were disabled by the fallback path (re-enabled before commit).
  const disabled = [];
  if (APPLY) {
    await dst.query("begin");
    await dst.query("savepoint srr");
    try {
      await dst.query("set local session_replication_role = replica");
    } catch {
      // Not allowed for this role: disable BuildTags' own triggers instead.
      await dst.query("rollback to savepoint srr");
      const { rows } = await dst.query(
        "select format('%I.%I', schemaname, tablename) as t from pg_tables where schemaname = 'buildtag'",
      );
      for (const r of rows) {
        await dst.query(`alter table ${r.t} disable trigger user`);
        disabled.push(r.t);
      }
    }
  }

  try {
    for (const t of TABLES) {
      const cols = await columnsFor(dst, t.name);
      const srcCols = new Set((await columnsFor(src, t.name)).map((c) => c.column_name));
      const shared = cols.filter((c) => srcCols.has(c.column_name));
      const list = shared.map((c) => `"${c.column_name}"`).join(", ");
      const { rows } = await src.query(
        `select coalesce(json_agg(r), '[]'::json) as data, count(*)::int as n from (select ${list} from ${t.name} ${t.where ? `where ${t.where}` : ""}) r`,
      );
      const { data, n } = rows[0];
      console.log(`  ${t.name.padEnd(36)} ${String(n).padStart(6)} rows`);
      if (!APPLY || n === 0) continue;
      const overriding = shared.some((c) => c.ident) ? "overriding system value" : "";
      const conflict = t.upsert
        ? `on conflict (${t.upsert}) do update set ${shared.filter((c) => c.column_name !== t.upsert).map((c) => `"${c.column_name}" = excluded."${c.column_name}"`).join(", ")}`
        : "";
      await dst.query(
        `insert into ${t.name} (${list}) ${overriding} select ${list} from json_populate_recordset(null::${t.name}, $1::json) ${conflict}`,
        [JSON.stringify(data)],
      );
    }

    if (APPLY) {
      // Identity sequences and the order-number sequence continue where production left off.
      for (const tbl of ["scan_events", "product_clicks", "social_clicks", "build_likes", "order_events"]) {
        await dst.query(`select setval(pg_get_serial_sequence('buildtag.${tbl}', 'id'), greatest((select coalesce(max(id), 0) from buildtag.${tbl}), 1))`);
      }
      const seq = await src.query("select last_value::bigint as v, is_called from buildtag.order_number_seq");
      await dst.query("select setval('buildtag.order_number_seq', $1, $2)", [seq.rows[0].v, seq.rows[0].is_called]);
      for (const t of disabled) await dst.query(`alter table ${t} enable trigger user`);
      await dst.query("commit");
      console.log("Database copy committed.");
    }
  } catch (err) {
    if (APPLY) await dst.query("rollback");
    console.error("Copy failed, target rolled back:", err.message);
    process.exit(1);
  } finally {
    await src.end();
    await dst.end();
  }

  // Storage files (names listed from the source database, bytes via the storage API).
  const oldUrl = process.env.OLD_SUPABASE_URL;
  const newUrl = process.env.NEW_SUPABASE_URL;
  const oldKey = process.env.OLD_SERVICE_KEY;
  const newKey = process.env.NEW_SERVICE_KEY;
  if (!oldUrl || !newUrl || !oldKey || !newKey) {
    console.log("\n!! OLD_SERVICE_KEY / NEW_SERVICE_KEY not set: photos and other uploaded files were NOT copied.");
    console.log("!! Add both service_role keys to .env.migrate before running --apply, or the photos stay behind.");
    return;
  }
  const oldSb = createClient(oldUrl, oldKey, { auth: { persistSession: false } });
  const newSb = createClient(newUrl, newKey, { auth: { persistSession: false } });
  const lister = new pg.Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
  await lister.connect();
  const { rows: objects } = await lister.query(
    "select bucket_id, name, metadata->>'mimetype' as mime from storage.objects where bucket_id = any($1) order by bucket_id, name",
    [BUCKETS],
  );
  await lister.end();
  let copied = 0;
  let failed = 0;
  for (const o of objects) {
    if (!APPLY) continue;
    const { data, error } = await oldSb.storage.from(o.bucket_id).download(o.name);
    if (error || !data) {
      failed++;
      console.error(`  download failed: ${o.bucket_id}/${o.name}`);
      continue;
    }
    const up = await newSb.storage.from(o.bucket_id).upload(o.name, data, { contentType: o.mime ?? undefined, upsert: true });
    if (up.error) {
      failed++;
      console.error(`  upload failed: ${o.bucket_id}/${o.name}: ${up.error.message}`);
    } else copied++;
  }
  console.log(APPLY ? `Storage: ${copied} files copied, ${failed} failed (of ${objects.length}).` : `Storage: ${objects.length} files would be copied.`);
}

main();
