/**
 * RLS verification against a live Supabase project.
 *
 *   pnpm rls:test
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY in .env.local. The service-role key is used ONLY
 * to create and delete two throwaway users; every assertion runs with the
 * anon key as those users (or as nobody). Exit code 1 on any failure.
 */
import "dotenv/config";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

type Client = SupabaseClient<Database, "buildtag">;

const admin = createClient<Database, "buildtag">(url, service, { db: { schema: "buildtag" }, auth: { persistSession: false } });

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? ` :: ${detail}` : ""}`);
  if (!ok) failures++;
}

async function userClient(email: string, password: string): Promise<{ client: Client; id: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: email.split("@")[0].replace(/[^a-z0-9_]/g, ""), display_name: "RLS Test" },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const client = createClient<Database, "buildtag">(url!, anon!, { db: { schema: "buildtag" }, auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign-in failed: ${signInError.message}`);
  return { client, id: data.user.id };
}

async function main() {
  const stamp = Date.now().toString(36);
  const a = await userClient(`rls_a_${stamp}@buildtag.example`, `Test-${stamp}-A!`);
  const b = await userClient(`rls_b_${stamp}@buildtag.example`, `Test-${stamp}-B!`);
  const nobody = createClient<Database, "buildtag">(url!, anon!, { db: { schema: "buildtag" }, auth: { persistSession: false } });

  try {
    await a.client.rpc("ensure_profile");
    await b.client.rpc("ensure_profile");

    // A creates a vehicle + modification
    const { data: vehicle, error: vErr } = await a.client
      .from("vehicles")
      .insert({ owner_id: a.id, make: "Test", model: "Car", year: 2020, nickname: "RLS" })
      .select("*")
      .single();
    check("owner can create a vehicle", !vErr && !!vehicle, vErr?.message);
    if (!vehicle) throw new Error("no vehicle");

    const { data: mod } = await a.client.from("modifications").insert({ vehicle_id: vehicle.id, category: "engine", part_name: "Test Part" }).select("*").single();
    check("owner can add a modification", !!mod);

    // B cannot read/edit/delete A's things
    const { data: bRead } = await b.client.from("vehicles").select("id").eq("id", vehicle.id);
    check("user B cannot read user A vehicle", (bRead ?? []).length === 0);

    const { data: bUpdate } = await b.client.from("vehicles").update({ nickname: "HACKED" }).eq("id", vehicle.id).select("id");
    check("user B cannot edit user A vehicle", (bUpdate ?? []).length === 0);

    const { data: bDelete } = await b.client.from("modifications").delete().eq("id", mod!.id).select("id");
    check("user B cannot delete user A modification", (bDelete ?? []).length === 0);

    const { error: bInsert } = await b.client.from("modifications").insert({ vehicle_id: vehicle.id, category: "engine", part_name: "Injected" });
    check("user B cannot insert a modification on user A vehicle", !!bInsert);

    // anon cannot touch tables directly
    const { data: anonRows, error: anonErr } = await nobody.from("vehicles").select("id").limit(1);
    check("anonymous cannot select vehicles table", !!anonErr || (anonRows ?? []).length === 0);

    // public read model
    const pub = await nobody.rpc("get_public_build", { p_slug: vehicle.slug });
    check("anonymous can read a public build via RPC", (pub.data as { access?: string } | null)?.access === "ok", JSON.stringify(pub.error ?? pub.data));

    const { data: listed } = await nobody.from("public_builds").select("slug").eq("slug", vehicle.slug);
    check("public build appears in explore view", (listed ?? []).length === 1);

    // unlisted: direct link works, not in explore
    await a.client.from("vehicles").update({ visibility: "unlisted" }).eq("id", vehicle.id);
    const unl = await nobody.rpc("get_public_build", { p_slug: vehicle.slug });
    check("unlisted build readable by direct link", (unl.data as { access?: string } | null)?.access === "ok");
    const { data: unlListed } = await nobody.from("public_builds").select("slug").eq("slug", vehicle.slug);
    check("unlisted build hidden from explore", (unlListed ?? []).length === 0);

    // private: not retrievable anonymously, owner still can
    await a.client.from("vehicles").update({ visibility: "private" }).eq("id", vehicle.id);
    const priv = await nobody.rpc("get_public_build", { p_slug: vehicle.slug });
    check("private build not retrievable anonymously", (priv.data as { access?: string } | null)?.access === "private");
    const privOwner = await a.client.rpc("get_public_build", { p_slug: vehicle.slug });
    check("owner can still read own private build", (privOwner.data as { access?: string } | null)?.access === "ok");
    const privB = await b.client.rpc("get_public_build", { p_slug: vehicle.slug });
    check("another user cannot read a private build", (privB.data as { access?: string } | null)?.access === "private");

    // QR redirect respects state
    const { data: qr } = await a.client.from("qr_codes").select("code").eq("vehicle_id", vehicle.id).single();
    check("vehicle got a permanent QR code", !!qr?.code && /^[A-HJ-NP-Z2-9]{8}$/.test(qr!.code));
    const scanPrivate = await nobody.rpc("resolve_scan", { p_code: qr!.code, p_record: false });
    check("scan of private build returns private", (scanPrivate.data as { status?: string } | null)?.status === "private");

    await a.client.from("vehicles").update({ visibility: "public" }).eq("id", vehicle.id);
    const scanOk = await nobody.rpc("resolve_scan", { p_code: qr!.code, p_record: true });
    check("scan of public build resolves to slug", (scanOk.data as { status?: string; slug?: string } | null)?.slug === vehicle.slug);

    const { data: afterScan } = await a.client.from("vehicles").select("scan_count").eq("id", vehicle.id).single();
    check("scan increments vehicle scan_count", afterScan?.scan_count === 1);

    // owner cannot change QR status (permanence)
    const { data: qrUpd } = await a.client.from("qr_codes").update({ status: "disabled" }).eq("vehicle_id", vehicle.id).select("id");
    check("owner cannot modify qr_codes", (qrUpd ?? []).length === 0);

    // non-admin cannot use admin functions
    const adminTry = await b.client.rpc("admin_set_vehicle_status", { p_vehicle_id: vehicle.id, p_status: "disabled" });
    check("non-admin cannot disable a build", !!adminTry.error);
    const isAdminB = await b.client.rpc("is_admin");
    check("non-admin is_admin() is false", isAdminB.data === false);

    // grant admin to B via the admins table (operator action), then verify
    await admin.from("admins").insert({ user_id: b.id });
    const isAdminB2 = await b.client.rpc("is_admin");
    check("admins table grants is_admin()", isAdminB2.data === true);
    const disable = await b.client.rpc("admin_set_vehicle_status", { p_vehicle_id: vehicle.id, p_status: "disabled" });
    check("admin can disable a build", !disable.error, disable.error?.message);
    const disabledPub = await nobody.rpc("get_public_build", { p_slug: vehicle.slug });
    check("disabled build inaccessible publicly", (disabledPub.data as { access?: string } | null)?.access === "disabled");
    const scanDisabled = await nobody.rpc("resolve_scan", { p_code: qr!.code, p_record: false });
    check("scan of disabled build returns build_disabled", (scanDisabled.data as { status?: string } | null)?.status === "build_disabled");
    const restore = await b.client.rpc("admin_set_vehicle_status", { p_vehicle_id: vehicle.id, p_status: "active" });
    check("admin can restore a build", !restore.error);
    const { data: bAdminRead } = await b.client.from("vehicles").select("id").eq("id", vehicle.id);
    check("admin can read any vehicle", (bAdminRead ?? []).length === 1);

    // likes: one per visitor key
    const like1 = await nobody.rpc("toggle_like", { p_slug: vehicle.slug, p_visitor_key: "visitor-key-0123456789abcdef" });
    const like2 = await nobody.rpc("toggle_like", { p_slug: vehicle.slug, p_visitor_key: "visitor-key-0123456789abcdef" });
    check("like toggles on then off", (like1.data as { liked?: boolean })?.liked === true && (like2.data as { liked?: boolean })?.liked === false);

    // analytics restricted to owner/admin
    const anB = await b.client.rpc("vehicle_analytics", { p_vehicle_id: vehicle.id });
    check("admin can read analytics", !anB.error);
    await admin.from("admins").delete().eq("user_id", b.id);
    const anB2 = await b.client.rpc("vehicle_analytics", { p_vehicle_id: vehicle.id });
    check("non-owner cannot read analytics", !!anB2.error);

    // plan limit: free = 1 vehicle
    const { error: secondVehicle } = await a.client.from("vehicles").insert({ owner_id: a.id, make: "Second", model: "Car" });
    check("free plan blocks a second vehicle", !!secondVehicle && secondVehicle.message.includes("vehicle limit"));
  } finally {
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id);
  }

  console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
