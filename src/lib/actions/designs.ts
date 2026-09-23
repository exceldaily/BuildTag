"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/supabase/server";
import { normalizeConfig } from "@/lib/tag/templates";
import type { Json, TagDesignRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

const saveSchema = z.object({
  id: z.string().uuid().nullable(),
  vehicleId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  config: z.record(z.string(), z.unknown()),
});

export async function saveTagDesignAction(input: {
  id: string | null;
  vehicleId: string;
  name: string;
  config: unknown;
}): Promise<ActionResult<TagDesignRow>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid design." };
  const config = normalizeConfig(parsed.data.config);
  const { client } = await requireProfile();

  const payload = {
    name: parsed.data.name,
    template: config.template,
    shape: config.shape,
    style: config.style,
    configuration_json: config as unknown as Json,
  };

  const query = parsed.data.id
    ? client.from("tag_designs").update(payload).eq("id", parsed.data.id).eq("vehicle_id", parsed.data.vehicleId)
    : client.from("tag_designs").insert({ ...payload, vehicle_id: parsed.data.vehicleId });

  const { data, error } = await query.select("*").maybeSingle();
  if (error) {
    const msg = error.message.includes("design limit") ? "Saved design limit reached for your plan." : error.message;
    return { ok: false, error: msg };
  }
  if (!data) return { ok: false, error: "Design not found." };
  revalidatePath(`/dashboard/vehicles/${parsed.data.vehicleId}`, "layout");
  return { ok: true, data: data as TagDesignRow };
}

export async function duplicateTagDesignAction(id: string): Promise<ActionResult<TagDesignRow>> {
  const { client } = await requireProfile();
  const { data: source } = await client.from("tag_designs").select("*").eq("id", id).maybeSingle();
  if (!source) return { ok: false, error: "Design not found." };
  const src = source as TagDesignRow;
  const { data, error } = await client
    .from("tag_designs")
    .insert({
      vehicle_id: src.vehicle_id,
      name: `${src.name} copy`.slice(0, 60),
      template: src.template,
      shape: src.shape,
      style: src.style,
      configuration_json: src.configuration_json,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not duplicate." };
  revalidatePath(`/dashboard/vehicles/${src.vehicle_id}`, "layout");
  return { ok: true, data: data as TagDesignRow };
}

export async function deleteTagDesignAction(id: string): Promise<ActionResult> {
  const { client } = await requireProfile();
  const { data, error } = await client.from("tag_designs").delete().eq("id", id).select("vehicle_id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Design not found." };
  revalidatePath(`/dashboard/vehicles/${data.vehicle_id}`, "layout");
  return { ok: true, data: undefined };
}
