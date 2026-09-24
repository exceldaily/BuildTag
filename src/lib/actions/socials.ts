"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/supabase/server";
import type { SocialLinkRow, SocialOwnerType } from "@/lib/types";
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";
import { socialLinkSchema } from "@/lib/validation/social";

const ownerTypeSchema = z.enum(["profile", "vehicle", "shop"]);

async function revalidateOwner(ownerType: SocialOwnerType, ownerId: string) {
  const { client } = await requireProfile();
  if (ownerType === "vehicle") {
    const { data } = await client.from("vehicles").select("slug").eq("id", ownerId).maybeSingle();
    revalidatePath(`/dashboard/vehicles/${ownerId}`, "layout");
    if (data?.slug) revalidatePath(`/build/${data.slug}`);
  } else if (ownerType === "profile") {
    revalidatePath("/dashboard/profile");
    // Owner socials appear on every build they own.
    const { data } = await client.from("vehicles").select("slug").eq("owner_id", ownerId);
    for (const v of data ?? []) revalidatePath(`/build/${v.slug}`);
  } else {
    const { data } = await client.from("organizations").select("slug").eq("id", ownerId).maybeSingle();
    revalidatePath("/dashboard/business", "layout");
    if (data?.slug) revalidatePath(`/org/${data.slug}`);
  }
}

export async function addSocialLinkAction(
  ownerType: SocialOwnerType,
  ownerId: string,
  form: FormData,
): Promise<ActionResult<SocialLinkRow>> {
  const type = ownerTypeSchema.safeParse(ownerType);
  const parsed = socialLinkSchema.safeParse(formToObject(form));
  if (!type.success) return { ok: false, error: "Invalid owner." };
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const { client, user } = await requireProfile();
  const resolvedOwnerId = type.data === "profile" ? user.id : ownerId;

  const { data: last } = await client
    .from("social_links")
    .select("sort_order")
    .eq("owner_type", type.data)
    .eq("owner_id", resolvedOwnerId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await client
    .from("social_links")
    .insert({
      owner_type: type.data,
      owner_id: resolvedOwnerId,
      platform: parsed.data.platform,
      handle: parsed.data.handle,
      url: parsed.data.url,
      is_public: parsed.data.is_public,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not add the link." };
  await revalidateOwner(type.data, resolvedOwnerId);
  return { ok: true, data: data as SocialLinkRow };
}

export async function updateSocialLinkAction(id: string, form: FormData): Promise<ActionResult<SocialLinkRow>> {
  const parsed = socialLinkSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { data, error } = await client
    .from("social_links")
    .update({ platform: parsed.data.platform, handle: parsed.data.handle, url: parsed.data.url, is_public: parsed.data.is_public })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Link not found." };
  const row = data as SocialLinkRow;
  await revalidateOwner(row.owner_type, row.owner_id);
  return { ok: true, data: row };
}

export async function toggleSocialVisibilityAction(id: string, isPublic: boolean): Promise<ActionResult<SocialLinkRow>> {
  const { client } = await requireProfile();
  const { data, error } = await client.from("social_links").update({ is_public: isPublic }).eq("id", id).select("*").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Link not found." };
  const row = data as SocialLinkRow;
  await revalidateOwner(row.owner_type, row.owner_id);
  return { ok: true, data: row };
}

export async function deleteSocialLinkAction(id: string): Promise<ActionResult> {
  const { client } = await requireProfile();
  const { data, error } = await client.from("social_links").delete().eq("id", id).select("owner_type, owner_id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Link not found." };
  await revalidateOwner(data.owner_type, data.owner_id);
  return { ok: true, data: undefined };
}

export async function reorderSocialLinksAction(
  ownerType: SocialOwnerType,
  ownerId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const parsed = z.array(z.string().uuid()).max(50).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const { client, user } = await requireProfile();
  const resolvedOwnerId = ownerType === "profile" ? user.id : ownerId;
  const results = await Promise.all(
    parsed.data.map((id, index) =>
      client
        .from("social_links")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("owner_type", ownerType)
        .eq("owner_id", resolvedOwnerId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  await revalidateOwner(ownerType, resolvedOwnerId);
  return { ok: true, data: undefined };
}
