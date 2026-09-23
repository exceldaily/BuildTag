import "server-only";

import { notFound } from "next/navigation";

import type { BuildTagClient } from "@/lib/supabase/server";
import type {
  ModificationRow,
  QrCodeRow,
  ShopRow,
  SocialLinkRow,
  TagDesignRow,
  VehiclePhotoRow,
  VehicleRow,
} from "@/lib/types";

/**
 * Owner-side data access. Every query runs as the signed-in user, so RLS
 * (0003) restricts rows to what they own. Nothing here is reachable by anon.
 */

export interface GarageVehicle extends VehicleRow {
  qr_codes: Pick<QrCodeRow, "code" | "status">[];
}

/**
 * The signed-in user's own vehicles. Filtered by owner explicitly: the RLS
 * select policy also admits admins, and an admin's garage must stay theirs.
 */
export async function listGarage(client: BuildTagClient, ownerId: string): Promise<GarageVehicle[]> {
  const { data, error } = await client
    .from("vehicles")
    .select("*, qr_codes(code, status)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GarageVehicle[];
}

/** Vehicle by id, owned by the caller. 404s when missing or not owned (even for admins). */
export async function getOwnedVehicle(client: BuildTagClient, id: string, ownerId: string): Promise<VehicleRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await client.from("vehicles").select("*").eq("id", id).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  return data as VehicleRow;
}

export async function getVehicleQr(client: BuildTagClient, vehicleId: string): Promise<QrCodeRow | null> {
  const { data } = await client
    .from("qr_codes")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as QrCodeRow | null) ?? null;
}

export async function listPhotos(client: BuildTagClient, vehicleId: string): Promise<VehiclePhotoRow[]> {
  const { data, error } = await client
    .from("vehicle_photos")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as VehiclePhotoRow[];
}

export async function listModifications(client: BuildTagClient, vehicleId: string): Promise<ModificationRow[]> {
  const { data, error } = await client
    .from("modifications")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("category")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as ModificationRow[];
}

export async function listSocialLinks(
  client: BuildTagClient,
  ownerType: "profile" | "vehicle" | "shop",
  ownerId: string,
): Promise<SocialLinkRow[]> {
  const { data, error } = await client
    .from("social_links")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as SocialLinkRow[];
}

export async function listTagDesigns(client: BuildTagClient, vehicleId: string): Promise<TagDesignRow[]> {
  const { data, error } = await client
    .from("tag_designs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TagDesignRow[];
}

export async function listShops(client: BuildTagClient): Promise<Pick<ShopRow, "id" | "name" | "slug" | "verified">[]> {
  const { data } = await client.from("shops").select("id, name, slug, verified").order("name").limit(200);
  return (data ?? []) as Pick<ShopRow, "id" | "name" | "slug" | "verified">[];
}

/** Very small suggestion search over the standardized parts catalog. */
export async function suggestParts(client: BuildTagClient, query: string) {
  if (query.trim().length < 2) return [];
  const { data } = await client
    .from("parts")
    .select("id, brand, name, slug, category, part_number")
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
    .limit(8);
  return data ?? [];
}
