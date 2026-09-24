/**
 * Runs migration 0014 (organizations + claims) and its security tests against
 * the BuildTag Supabase project straight from the files on disk.
 *
 *   node scripts/db-migrate-0014.mjs            # dry run: migrate + test, ALWAYS rolled back
 *   node scripts/db-migrate-0014.mjs --apply    # migrate + test; commits only if every test passes
 *
 * Uses the same NEW_DB_URL as scripts/migrate-project.mjs (set in your shell,
 * never pasted anywhere). Run it AFTER the data copy: 0014 renames `shops` and
 * backfills owner/creator relationships for existing vehicles.
 *
 * The tests run inside a savepoint and are always undone, including their
 * throwaway users and the bt_test schema. Output is test names and PASS/FAIL
 * only, never row data.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const url = process.env.NEW_DB_URL;
if (!url) {
  console.error("Missing env var NEW_DB_URL. See the header of scripts/migrate-project.mjs.");
  process.exit(1);
}
if (!/gncqfzxckjgqslreocti/.test(url)) {
  console.error("NEW_DB_URL does not point at the BuildTag project (gncqfzxckjgqslreocti). Refusing.");
  process.exit(1);
}

const migration = readFileSync(new URL("../supabase/migrations/0014_buildtag_organizations.sql", import.meta.url), "utf8");
const tests = readFileSync(new URL("../supabase/tests/0014_org_claims.test.sql", import.meta.url), "utf8");
// the test file ends with a SELECT of the results; run it separately
const testBody = tests.replace(/select n, case when ok[\s\S]*$/i, "");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const done = await client.query(
  "select exists (select 1 from supabase_migrations.schema_migrations where name = '0014_buildtag_organizations') as applied",
);
if (done.rows[0].applied) {
  console.log("0014 is already applied on this project. Nothing to do.");
  await client.end();
  process.exit(0);
}

let failed = 0;
try {
  await client.query("begin");
  console.log("Running 0014...");
  await client.query(migration);
  console.log("Migration ran. Running security tests (always undone)...");
  await client.query("savepoint tests");
  await client.query(testBody);
  const { rows } = await client.query("select n, ok, test, detail from bt_test.results order by n");
  await client.query("rollback to savepoint tests");
  for (const r of rows) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.test}${!r.ok && r.detail ? `  (${String(r.detail).slice(0, 160)})` : ""}`);
  }
  console.log(`\n${rows.length - failed}/${rows.length} passed.`);

  if (APPLY && failed === 0 && rows.length > 0) {
    const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    await client.query(
      "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, '0014_buildtag_organizations', array[$2])",
      [version, migration],
    );
    await client.query("commit");
    console.log("0014 applied and recorded.");
  } else {
    await client.query("rollback");
    console.log(APPLY ? "Not applied: fix the failures first. Everything was rolled back." : "Dry run: everything was rolled back.");
  }
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Error, everything rolled back:", err.message);
  if (err.position) {
    const pos = Number(err.position);
    const text = err.where?.includes("bt_test") ? testBody : migration;
    const line = text.slice(0, pos).split("\n").length;
    console.error(`  near line ${line}`);
  }
  if (err.where) console.error("  where:", String(err.where).split("\n")[0]);
  process.exitCode = 1;
} finally {
  await client.end();
}
if (failed) process.exitCode = 1;
