"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation/common";

const nameSchema = z.string().trim().min(2, "At least 2 characters").max(40, "40 characters max");
const taglineSchema = z.string().trim().max(140, "140 characters max").default("");

function message(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

export async function createCrewAction(form: FormData): Promise<ActionResult<{ slug: string }>> {
  const name = nameSchema.safeParse(form.get("name"));
  const tagline = taglineSchema.safeParse(form.get("tagline") ?? "");
  if (!name.success) return { ok: false, error: name.error.issues[0]?.message ?? "Check the crew name.", fieldErrors: { name: name.error.issues[0]?.message ?? "" } };
  if (!tagline.success) return { ok: false, error: tagline.error.issues[0]?.message ?? "Check the tagline.", fieldErrors: { tagline: tagline.error.issues[0]?.message ?? "" } };
  const { client } = await requireProfile("/dashboard/crew");
  const { data, error } = await client.rpc("create_crew", { p_name: name.data, p_tagline: tagline.data });
  if (error || !data) return { ok: false, error: message(error, "Could not create the crew.") };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: { slug: (data as { slug: string }).slug } };
}

export async function updateCrewAction(form: FormData): Promise<ActionResult> {
  const name = nameSchema.safeParse(form.get("name"));
  const tagline = taglineSchema.safeParse(form.get("tagline") ?? "");
  if (!name.success) return { ok: false, error: name.error.issues[0]?.message ?? "Check the crew name." };
  if (!tagline.success) return { ok: false, error: tagline.error.issues[0]?.message ?? "Check the tagline." };
  const { client } = await requireProfile("/dashboard/crew");
  const { error } = await client.rpc("update_crew", { p_name: name.data, p_tagline: tagline.data });
  if (error) return { ok: false, error: message(error, "Could not save.") };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: undefined };
}

export async function addCrewMemberAction(username: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(3).max(31).safeParse(username);
  if (!parsed.success) return { ok: false, error: "Enter a username." };
  const { client } = await requireProfile("/dashboard/crew");
  const { error } = await client.rpc("crew_add_member", { p_username: parsed.data });
  if (error) return { ok: false, error: message(error, "Could not add that member.") };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: undefined };
}

export async function removeCrewMemberAction(userId: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid member." };
  const { client } = await requireProfile("/dashboard/crew");
  const { error } = await client.rpc("crew_remove_member", { p_user_id: parsed.data });
  if (error) return { ok: false, error: message(error, "Could not remove that member.") };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: undefined };
}

export async function deleteCrewAction(): Promise<ActionResult> {
  const { client } = await requireProfile("/dashboard/crew");
  const { error } = await client.rpc("delete_crew");
  if (error) return { ok: false, error: message(error, "Could not delete the crew.") };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: undefined };
}
