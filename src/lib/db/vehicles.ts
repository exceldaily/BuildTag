import "server-only";

import { notFound } from "next/navigation";

import type { BuildTagClient } from "@/lib/supabase/server";
import type {
  ModificationRow,
  QrCodeRow,
  ShopRow,
  SocialLinkRow,
  TagDesignRow,
  VehicleManageContext,
  VehiclePhotoRow,
  VehicleRow,
} from "@/lib/types";

/**
 * Owner-side data access. Every query runs as the signed-in user, so RLS
 * (0003, 0014) restricts rows to what they own or manage for a business.
 * Nothing here is reachable by anon.
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

/**
 * Vehicle by id that the caller may manage: its owner, or staff of the
 * business managing it while it is unclaimed (0014). 404s otherwise, even
 * for admins, so an admin never edits someone else's build by accident.
 */
export async function getOwnedVehicle(client: BuildTagClient, id: string, userId: string): Promise<VehicleRow> {
  return (await getManagedVehicle(client, id, userId)).vehicle;
}

export interface ManagedVehicle {
  vehicle: VehicleRow;
  /** Set when the caller works on this vehicle for a business rather than as its owner. */
  organization: VehicleManageContext["organization"];
  isOwner: boolean;
}

export async function getManagedVehicle(client: BuildTagClient, id: string, userId: string): Promise<ManagedVehicle> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await client.from("vehicles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const vehicle = data as VehicleRow;
  if (vehicle.owner_id === userId) return { vehicle, organization: null, isOwner: true };
  if (vehicle.owner_id !== null) notFound();
  const ctx = await getManageContext(client, id);
  if (!ctx.organization) notFound();
  return { vehicle, organization: ctx.organization, isOwner: false };
}

export async function getManageContext(client: BuildTagClient, vehicleId: string): Promise<VehicleManageContext> {
  const { data, error } = await client.rpc("vehicle_manage_context", { p_vehicle_id: vehicleId });
  if (error) throw new Error(error.message);
  return (data as unknown as VehicleManageContext | null) ?? { is_owner: false, organization: null };
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

/** Active businesses for the installer picker. */
export async function listOrganizations(client: BuildTagClient): Promise<ShopRow[]> {
  const { data } = await client
    .from("organizations")
    .select("id, name, slug, organization_type, verified_status")
    .eq("status", "active")
    .order("name")
    .limit(300);
  return (data ?? []) as ShopRow[];
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
