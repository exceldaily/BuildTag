"use server";

import { redirect } from "next/navigation";

import { removeUserFiles, removeVehiclePhotos } from "@/lib/storage-cleanup";
import { requireProfile } from "@/lib/supabase/server";
import type { AccountDeletionCheck } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

/**
 * Deletes the signed-in user's account. Re-checks the password, removes the
 * user's stored files while the rows that authorize it still exist, then
 * delete_my_account() does the rest in one transaction (0018).
 */
export async function deleteAccountAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const confirm = String(form.get("confirm") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (confirm !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  if (!password) return { ok: false, error: "Enter your password." };

  const { client, user } = await requireProfile();
  if (!user.email) return { ok: false, error: "Contact us to delete this account." };
  const { error: authError } = await client.auth.signInWithPassword({ email: user.email, password });
  if (authError) return { ok: false, error: "That password is not correct." };

  const { data, error: checkError } = await client.rpc("account_deletion_check");
  if (checkError || !data) return { ok: false, error: checkError?.message ?? "Could not check your account." };
  const check = data as unknown as AccountDeletionCheck;
  if (check.sole_owner_of.length || check.orders_in_progress || check.active_subscription) {
    return { ok: false, error: "Clear the items listed above first." };
  }

  for (const id of check.delete_vehicle_ids) await removeVehiclePhotos(client, id);
  await removeUserFiles(client, user.id);

  const { error } = await client.rpc("delete_my_account", { p_confirm: "DELETE" });
  if (error) return { ok: false, error: error.message };

  await client.auth.signOut();
  redirect("/login?deleted=1");
}
