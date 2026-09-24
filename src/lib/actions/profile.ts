"use server";

import { revalidatePath } from "next/cache";

import { setLocaleCookie } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";
import { profileSchema } from "@/lib/validation/profile";

export async function saveProfileAction(_prev: ActionResult<ProfileRow> | null, form: FormData): Promise<ActionResult<ProfileRow>> {
  const parsed = profileSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const { client, user, profile } = await requireProfile();

  if (parsed.data.username !== profile.username) {
    const { data: available } = await client.rpc("username_available", { p_username: parsed.data.username });
    if (available === false) {
      return { ok: false, error: "That username is taken.", fieldErrors: { username: "Already taken" } };
    }
  }

  const { data, error } = await client.from("profiles").update(parsed.data).eq("id", user.id).select("*").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save." };

  await setLocaleCookie(parsed.data.locale);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/", "layout");
  const { data: vehicles } = await client.from("vehicles").select("slug").eq("owner_id", user.id);
  for (const v of vehicles ?? []) revalidatePath(`/build/${v.slug}`);
  return { ok: true, data: data as ProfileRow };
}
