/**
 * Hand-maintained mirror of the `buildtag` schema (supabase/migrations).
 * Keep enums in sync with 0001_buildtag_schema.sql.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SocialOwnerType = "profile" | "vehicle" | "shop";
export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "threads"
  | "twitch"
  | "discord"
  | "website"
  | "other";
export type HorsepowerType = "HP" | "WHP";
export type TorqueUnit = "LB_FT" | "NM";
export type MileageUnit = "MI" | "KM";
export type VehicleVisibility = "public" | "unlisted" | "private";
export type VehicleStatus = "active" | "disabled";
export type QrStatus = "active" | "disabled";
export type ModCategory =
  | "engine"
  | "forced_induction"
  | "intake"
  | "exhaust"
  | "fuel_system"
  | "cooling"
  | "ecu_tuning"
  | "transmission"
  | "drivetrain"
  | "suspension"
  | "brakes"
  | "wheels"
  | "tires"
  | "exterior"
  | "interior"
  | "lighting"
  | "audio"
  | "electronics"
  | "safety"
  | "weight_reduction"
  | "aero"
  | "other";
export type ReportReason = "spam" | "inappropriate" | "copyright" | "impersonation" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type Plan = "free" | "pro";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";
export type DeviceType = "mobile" | "tablet" | "desktop" | "other";

export const MOD_CATEGORIES: { value: ModCategory; label: string }[] = [
  { value: "engine", label: "Engine" },
  { value: "forced_induction", label: "Forced Induction" },
  { value: "intake", label: "Intake" },
  { value: "exhaust", label: "Exhaust" },
  { value: "fuel_system", label: "Fuel System" },
  { value: "cooling", label: "Cooling" },
  { value: "ecu_tuning", label: "ECU / Tuning" },
  { value: "transmission", label: "Transmission" },
  { value: "drivetrain", label: "Drivetrain" },
  { value: "suspension", label: "Suspension" },
  { value: "brakes", label: "Brakes" },
  { value: "wheels", label: "Wheels" },
  { value: "tires", label: "Tires" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "lighting", label: "Lighting" },
  { value: "audio", label: "Audio" },
  { value: "electronics", label: "Electronics" },
  { value: "safety", label: "Safety" },
  { value: "weight_reduction", label: "Weight Reduction" },
  { value: "aero", label: "Aero" },
  { value: "other", label: "Other" },
];

export const MOD_CATEGORY_LABEL: Record<ModCategory, string> = Object.fromEntries(
  MOD_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<ModCategory, string>;

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; base: string | null }[] = [
  { value: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { value: "tiktok", label: "TikTok", base: "https://www.tiktok.com/@" },
  { value: "youtube", label: "YouTube", base: "https://www.youtube.com/@" },
  { value: "facebook", label: "Facebook", base: "https://www.facebook.com/" },
  { value: "x", label: "X", base: "https://x.com/" },
  { value: "threads", label: "Threads", base: "https://www.threads.net/@" },
  { value: "twitch", label: "Twitch", base: "https://www.twitch.tv/" },
  { value: "discord", label: "Discord", base: null },
  { value: "website", label: "Website", base: null },
  { value: "other", label: "Other", base: null },
];

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.value, p.label]),
) as Record<SocialPlatform, string>;

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "copyright", label: "Copyright" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

/* ---------------------------------------------------------------------------
 * Row types
 * ------------------------------------------------------------------------- */

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  location_text: string;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopRow {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string;
  website_url: string | null;
  location_text: string;
  instagram_handle: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartRow {
  id: string;
  brand: string;
  name: string;
  slug: string;
  part_number: string | null;
  category: ModCategory;
  description: string;
  image_url: string | null;
  manufacturer_url: string | null;
  created_at: string;
}

export interface VehicleRow {
  id: string;
  owner_id: string;
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  description: string;
  hero_image_url: string | null;
  profile_image_url: string | null;
  location_text: string;
  horsepower: number | null;
  horsepower_type: HorsepowerType;
  torque: number | null;
  torque_unit: TorqueUnit;
  mileage: number | null;
  mileage_unit: MileageUnit;
  build_started_year: number | null;
  build_cost: number | null;
  build_cost_public: boolean;
  dyno_type: string;
  visibility: VehicleVisibility;
  status: VehicleStatus;
  show_owner_section: boolean;
  mod_count: number;
  like_count: number;
  scan_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface VehiclePhotoRow {
  id: string;
  vehicle_id: string;
  storage_path: string;
  caption: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface ModificationRow {
  id: string;
  vehicle_id: string;
  public_id: string;
  category: ModCategory;
  brand: string;
  part_name: string;
  part_number: string;
  description: string;
  price: number | null;
  price_public: boolean;
  product_url: string | null;
  affiliate_url: string | null;
  merchant: string;
  affiliate_network: string;
  installed_by_text: string;
  shop_id: string | null;
  part_id: string | null;
  installation_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SocialLinkRow {
  id: string;
  public_id: string;
  owner_type: SocialOwnerType;
  owner_id: string;
  platform: SocialPlatform;
  handle: string;
  url: string;
  is_public: boolean;
  sort_order: number;
  created_at: string;
}

export interface QrCodeRow {
  id: string;
  vehicle_id: string;
  code: string;
  status: QrStatus;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  vehicle_id: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reporter_key: string | null;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export interface TagDesignRow {
  id: string;
  vehicle_id: string;
  name: string;
  template: string;
  shape: string;
  style: string;
  configuration_json: Json;
  created_at: string;
  updated_at: string;
}

export interface PublicBuildListRow {
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  hero_image_url: string | null;
  horsepower: number | null;
  horsepower_type: HorsepowerType;
  torque: number | null;
  torque_unit: TorqueUnit;
  mod_count: number;
  like_count: number;
  scan_count: number;
  created_at: string;
  updated_at: string;
  owner_username: string;
}

/* ---------------------------------------------------------------------------
 * Public build payload (buildtag.get_public_build)
 * ------------------------------------------------------------------------- */

export interface PublicSocial {
  public_id: string;
  platform: SocialPlatform;
  handle: string;
  url: string;
}

export interface PublicShop {
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  verified: boolean;
  location_text: string;
}

export interface PublicModification {
  public_id: string;
  category: ModCategory;
  brand: string;
  part_name: string;
  part_number: string;
  description: string;
  price: number | null;
  has_link: boolean;
  installed_by_text: string;
  installation_date: string | null;
  shop: PublicShop | null;
  part: { brand: string; name: string; slug: string; image_url: string | null } | null;
}

export interface PublicPhoto {
  storage_path: string;
  caption: string;
  alt_text: string;
  width: number | null;
  height: number | null;
}

export interface PublicOwner {
  username: string;
  display_name?: string;
  avatar_url?: string | null;
  bio?: string;
  location_text?: string;
  website_url?: string | null;
  socials?: PublicSocial[];
}

export interface PublicBuild {
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  description: string;
  hero_image_url: string | null;
  profile_image_url: string | null;
  location_text: string;
  horsepower: number | null;
  horsepower_type: HorsepowerType;
  torque: number | null;
  torque_unit: TorqueUnit;
  mileage: number | null;
  mileage_unit: MileageUnit;
  build_started_year: number | null;
  build_cost: number | null;
  build_cost_public: boolean;
  dyno_type: string;
  visibility: VehicleVisibility;
  status: VehicleStatus;
  show_owner_section: boolean;
  mod_count: number;
  like_count: number;
  scan_count: number;
  created_at: string;
  updated_at: string;
  qr_code: string | null;
  photos: PublicPhoto[];
  modifications: PublicModification[];
  vehicle_socials: PublicSocial[];
  owner: PublicOwner;
}

export type PublicBuildResult =
  | { access: "ok"; is_owner: boolean; liked: boolean; build: PublicBuild }
  | { access: "private" }
  | { access: "disabled" }
  | { access: "not_found" };

export interface VehicleAnalytics {
  total_scans: number;
  scans_today: number;
  scans_7d: number;
  scans_30d: number;
  likes: number;
  product_clicks: number;
  social_clicks: number;
  scans_by_day: { day: string; count: number }[];
  top_parts: { part_name: string; brand: string; count: number }[];
  top_socials: { platform: SocialPlatform; handle: string; owner_type: SocialOwnerType; count: number }[];
  devices: Partial<Record<DeviceType, number>>;
  countries: { country: string; count: number }[];
}

export interface DashboardStats {
  vehicles: number;
  scans: number;
  likes: number;
  clicks: number;
}

/* ---------------------------------------------------------------------------
 * supabase-js Database generic
 * ------------------------------------------------------------------------- */

/** Columns Postgres fills in itself. */
type Generated = "id" | "created_at" | "updated_at";

type OptionalInsertKeys<TRow, TOptional extends keyof TRow> = Extract<Generated, keyof TRow> | TOptional;

type InsertOf<TRow, TOptional extends keyof TRow = never> = Omit<TRow, OptionalInsertKeys<TRow, TOptional>> &
  Partial<Pick<TRow, OptionalInsertKeys<TRow, TOptional>>>;

type UpdateOf<TRow> = Partial<Omit<TRow, "id" | "created_at">>;

interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

/**
 * Homomorphic mapped wrappers give the row interfaces the implicit index
 * signature postgrest-js requires; without them every Insert resolves to
 * `never`.
 */
interface Table<TRow, TInsert, TUpdate, TRelationships extends Relationship[] = []> {
  Row: { [K in keyof TRow]: TRow[K] };
  Insert: { [K in keyof TInsert]: TInsert[K] };
  Update: { [K in keyof TUpdate]: TUpdate[K] };
  Relationships: TRelationships;
}

type VehicleChild = [
  {
    foreignKeyName: "vehicle_id_fkey";
    columns: ["vehicle_id"];
    isOneToOne: false;
    referencedRelation: "vehicles";
    referencedColumns: ["id"];
  },
];

export interface ScanEventRow {
  id: number;
  vehicle_id: string;
  qr_code_id: string | null;
  occurred_at: string;
  referrer: string | null;
  country: string | null;
  device_type: DeviceType;
}

export interface Database {
  buildtag: {
    Tables: {
      profiles: Table<
        ProfileRow,
        InsertOf<ProfileRow, "display_name" | "avatar_url" | "bio" | "location_text" | "website_url"> & { id: string },
        UpdateOf<ProfileRow>
      >;
      admins: Table<{ user_id: string; created_at: string }, { user_id: string; created_at?: string }, Partial<{ user_id: string }>>;
      subscriptions: Table<SubscriptionRow, InsertOf<SubscriptionRow>, UpdateOf<SubscriptionRow>>;
      shops: Table<
        ShopRow,
        InsertOf<ShopRow, "owner_id" | "logo_url" | "description" | "website_url" | "location_text" | "instagram_handle" | "verified">,
        UpdateOf<ShopRow>
      >;
      parts: Table<PartRow, InsertOf<PartRow, "part_number" | "category" | "description" | "image_url" | "manufacturer_url">, UpdateOf<PartRow>>;
      vehicles: Table<
        VehicleRow,
        InsertOf<
          VehicleRow,
          | "slug"
          | "year"
          | "trim"
          | "nickname"
          | "description"
          | "hero_image_url"
          | "profile_image_url"
          | "location_text"
          | "horsepower"
          | "horsepower_type"
          | "torque"
          | "torque_unit"
          | "mileage"
          | "mileage_unit"
          | "build_started_year"
          | "build_cost"
          | "build_cost_public"
          | "dyno_type"
          | "visibility"
          | "status"
          | "show_owner_section"
          | "mod_count"
          | "like_count"
          | "scan_count"
          | "click_count"
        >,
        UpdateOf<VehicleRow>
      >;
      vehicle_photos: Table<
        VehiclePhotoRow,
        InsertOf<VehiclePhotoRow, "caption" | "alt_text" | "width" | "height" | "sort_order">,
        UpdateOf<VehiclePhotoRow>,
        VehicleChild
      >;
      modifications: Table<
        ModificationRow,
        InsertOf<
          ModificationRow,
          | "public_id"
          | "category"
          | "brand"
          | "part_number"
          | "description"
          | "price"
          | "price_public"
          | "product_url"
          | "affiliate_url"
          | "merchant"
          | "affiliate_network"
          | "installed_by_text"
          | "shop_id"
          | "part_id"
          | "installation_date"
          | "sort_order"
        >,
        UpdateOf<ModificationRow>,
        VehicleChild
      >;
      social_links: Table<
        SocialLinkRow,
        InsertOf<SocialLinkRow, "public_id" | "handle" | "is_public" | "sort_order">,
        UpdateOf<SocialLinkRow>
      >;
      qr_codes: Table<QrCodeRow, InsertOf<QrCodeRow, "status" | "scan_count" | "last_scanned_at">, UpdateOf<QrCodeRow>, VehicleChild>;
      scan_events: Table<ScanEventRow, InsertOf<ScanEventRow>, UpdateOf<ScanEventRow>, VehicleChild>;
      product_clicks: Table<
        { id: number; vehicle_id: string; modification_id: string | null; occurred_at: string },
        { vehicle_id: string; modification_id?: string | null; occurred_at?: string },
        Partial<{ vehicle_id: string; modification_id: string | null; occurred_at: string }>,
        VehicleChild
      >;
      social_clicks: Table<
        { id: number; vehicle_id: string; social_link_id: string | null; occurred_at: string },
        { vehicle_id: string; social_link_id?: string | null; occurred_at?: string },
        Partial<{ vehicle_id: string; social_link_id: string | null; occurred_at: string }>,
        VehicleChild
      >;
      build_likes: Table<
        { id: number; vehicle_id: string; visitor_key: string; created_at: string },
        { vehicle_id: string; visitor_key: string; created_at?: string },
        Partial<{ vehicle_id: string; visitor_key: string }>,
        VehicleChild
      >;
      reports: Table<
        ReportRow,
        InsertOf<ReportRow, "description" | "status" | "reporter_key" | "admin_note">,
        UpdateOf<ReportRow>,
        VehicleChild
      >;
      tag_designs: Table<
        TagDesignRow,
        InsertOf<TagDesignRow, "name" | "template" | "shape" | "style" | "configuration_json">,
        UpdateOf<TagDesignRow>,
        VehicleChild
      >;
    };
    Views: {
      public_builds: { Row: { [K in keyof PublicBuildListRow]: PublicBuildListRow[K] }; Relationships: [] };
    };
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
      ensure_profile: { Args: Record<never, never>; Returns: ProfileRow };
      username_available: { Args: { p_username: string }; Returns: boolean };
      user_plan: { Args: { p_user_id: string }; Returns: Plan };
      plan_limits: { Args: { p_plan: Plan }; Returns: Json };
      get_public_build: { Args: { p_slug: string; p_visitor_key?: string | null }; Returns: Json };
      resolve_scan: {
        Args: {
          p_code: string;
          p_referrer?: string | null;
          p_country?: string | null;
          p_device?: DeviceType;
          p_record?: boolean;
        };
        Returns: Json;
      };
      toggle_like: { Args: { p_slug: string; p_visitor_key: string }; Returns: Json };
      record_product_click: { Args: { p_slug: string; p_public_id: string }; Returns: string | null };
      record_social_click: { Args: { p_slug: string; p_public_id: string }; Returns: string | null };
      submit_report: {
        Args: { p_slug: string; p_reason: ReportReason; p_description: string; p_reporter_key: string };
        Returns: boolean;
      };
      vehicle_analytics: { Args: { p_vehicle_id: string }; Returns: Json };
      dashboard_stats: { Args: Record<never, never>; Returns: Json };
      admin_search_users: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          created_at: string;
          vehicle_count: number;
        }[];
      };
      admin_set_vehicle_status: { Args: { p_vehicle_id: string; p_status: VehicleStatus }; Returns: undefined };
      admin_set_qr_status: { Args: { p_qr_id: string; p_status: QrStatus }; Returns: undefined };
      admin_update_report: {
        Args: { p_report_id: string; p_status: ReportStatus; p_note?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      social_owner_type: SocialOwnerType;
      social_platform: SocialPlatform;
      horsepower_type: HorsepowerType;
      torque_unit: TorqueUnit;
      mileage_unit: MileageUnit;
      vehicle_visibility: VehicleVisibility;
      vehicle_status: VehicleStatus;
      qr_status: QrStatus;
      mod_category: ModCategory;
      report_reason: ReportReason;
      report_status: ReportStatus;
      plan: Plan;
      subscription_status: SubscriptionStatus;
      device_type: DeviceType;
    };
    CompositeTypes: Record<never, never>;
  };
}
