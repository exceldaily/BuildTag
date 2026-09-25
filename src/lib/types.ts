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

/* Business / ownership (0014) */
export type OrganizationType =
  | "dealership"
  | "custom_shop"
  | "performance_shop"
  | "motorcycle_shop"
  | "installer"
  | "tuner"
  | "manufacturer"
  | "dealer_group"
  | "other";
export type OrganizationStatus = "pending" | "active" | "suspended";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type OrgMemberRole = "owner" | "admin" | "manager" | "staff";
export type VehicleRelationshipType = "owner" | "creator" | "builder" | "dealer" | "installer" | "tuner" | "sponsor";
export type OwnershipStatus = "unclaimed" | "claim_pending" | "claimed" | "transfer_pending";
export type ClaimStatus = "active" | "claimed" | "expired" | "revoked";
export type ModSourceType = "owner" | "shop" | "dealer" | "manufacturer" | "import";
export type ModVerificationStatus = "owner_reported" | "shop_recorded" | "dealer_recorded" | "manufacturer_recorded";
export type CrewKind = "riding" | "shop" | "dealership" | "brand" | "customer";
export interface LegalAcceptanceRow {
  id: string;
  user_id: string;
  document_type: LegalDocumentType;
  document_version: string;
  accepted_at: string;
  acceptance_context: string;
  subject_type: string | null;
  subject_id: string | null;
  related: Json;
  user_agent: string | null;
  created_at: string;
}

/** Mirrors buildtag.legal_document_type (0015). */
export type LegalDocumentType =
  | "terms"
  | "privacy"
  | "disclaimer"
  | "refunds"
  | "custom_product_approval"
  | "business_authorization"
  | "vehicle_claim_confirmation";

export type BusinessInquiryStatus = "new" | "contacted" | "qualified" | "pilot" | "customer" | "closed" | "spam";

export const ORGANIZATION_TYPES: { value: OrganizationType; label: string }[] = [
  { value: "custom_shop", label: "Custom shop" },
  { value: "performance_shop", label: "Performance shop" },
  { value: "motorcycle_shop", label: "Motorcycle shop" },
  { value: "dealership", label: "Dealership" },
  { value: "dealer_group", label: "Dealer group" },
  { value: "installer", label: "Installer" },
  { value: "tuner", label: "Tuner" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "other", label: "Other" },
];

export const ORGANIZATION_TYPE_LABEL = Object.fromEntries(ORGANIZATION_TYPES.map((t) => [t.value, t.label])) as Record<
  OrganizationType,
  string
>;

export const RELATIONSHIP_LABEL: Record<VehicleRelationshipType, string> = {
  owner: "Owner",
  creator: "Creator",
  builder: "Builder",
  dealer: "Dealer",
  installer: "Installer",
  tuner: "Tuner",
  sponsor: "Sponsor",
};

/** Public badge wording. Says who recorded a part, never certification or OEM approval. */
export const SOURCE_BADGE: Record<ModSourceType, string> = {
  owner: "Owner added",
  shop: "Shop installed",
  dealer: "Dealer installed",
  manufacturer: "Factory recorded",
  import: "Imported",
};

export const ORG_ROLE_LABEL: Record<OrgMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

export const CREW_KIND_LABEL: Record<CrewKind, string> = {
  riding: "Riding crew",
  shop: "Shop community",
  dealership: "Dealership community",
  brand: "Brand community",
  customer: "Customer community",
};

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

export interface LeaderboardRow {
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  hero_image_url: string | null;
  owner_username: string | null;
  like_count: number;
  mod_count: number;
  horsepower: number | null;
  horsepower_type: HorsepowerType;
  scans: number;
}

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
  locale: "en" | "fr" | "de" | "es" | "th";
  region: string;
  created_at: string;
  updated_at: string;
}

export interface CrewMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: "owner" | "member";
  joined_at: string;
}

export interface CrewLeaderboardRow {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  created_at: string;
  kind: CrewKind;
  organization: PublicShop | null;
  member_count: number;
  build_count: number;
  hero_image_url: string | null;
  scans: number;
}

export interface Crew {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  created_at: string;
  kind: CrewKind;
  /** Set for business crews (shop / dealership communities). */
  organization: PublicShop | null;
  owner_username: string | null;
  members: CrewMember[];
  builds: PublicBuildListRow[];
  total_scans: number;
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
  note: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRow {
  id: string;
  created_by_user_id: string | null;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  status: OrganizationStatus;
  verified_status: VerificationStatus;
  tagline: string;
  logo_url: string | null;
  description: string;
  website_url: string | null;
  location_text: string;
  instagram_handle: string | null;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
}

/** Installer picker entry. */
export type ShopRow = Pick<OrganizationRow, "id" | "name" | "slug" | "organization_type" | "verified_status">;

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
  /** Current owner. Null while a business-created vehicle is unclaimed. */
  owner_id: string | null;
  ownership_status: OwnershipStatus;
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
  installed_by_organization_id: string | null;
  part_id: string | null;
  installation_date: string | null;
  sort_order: number;
  created_by_user_id: string | null;
  created_by_organization_id: string | null;
  source_type: ModSourceType;
  verification_status: ModVerificationStatus;
  /** Private to the business that recorded the part. */
  work_order_reference: string;
  is_hidden: boolean;
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

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "payment_processing"
  | "paid"
  | "needs_review"
  | "artwork_approved"
  | "artwork_issue"
  | "preparing_artwork"
  | "submitted_to_printer"
  | "sent_to_maker"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "production_error";
export type PaymentStatus = "unpaid" | "pending" | "processing" | "paid" | "refunded" | "failed";
export type FulfillmentStatus = "not_started" | "queued" | "submitted" | "in_production" | "shipped" | "delivered" | "error";
export type ValidationStatus = "passed" | "heuristic_only" | "failed";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  payment_processing: "Payment processing",
  paid: "Paid",
  needs_review: "Needs review",
  artwork_approved: "Artwork approved",
  artwork_issue: "Artwork issue",
  preparing_artwork: "Preparing artwork",
  submitted_to_printer: "Sent to maker",
  sent_to_maker: "Sent to maker",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  production_error: "Production issue",
};

export interface PrintSpecificationRow {
  id: string;
  name: string;
  size_id: string;
  width: number;
  height: number;
  units: "in" | "mm";
  bleed: number;
  safe_margin: number;
  material: string;
  finish: string;
  cut_path_style: Json;
  min_module_mm: number;
  price_cents: number;
  currency: string;
  provider: string | null;
  provider_sku: string | null;
  sku: string | null;
  product_name: string;
  product_type: string;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionSnapshotRow {
  id: string;
  user_id: string;
  tag_design_id: string | null;
  vehicle_id: string | null;
  qr_code_id: string | null;
  print_specification_id: string | null;
  configuration_json: Json;
  width: number;
  height: number;
  units: "in" | "mm";
  material: string;
  finish: string;
  quantity: number;
  qr_destination_at_order: string;
  svg_storage_path: string | null;
  png_storage_path: string | null;
  validation_status: ValidationStatus;
  validation_report: Json;
  artwork_sha256: string | null;
  proof_storage_path: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_name: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_phone: string;
  customer_email: string;
  payment_provider: string | null;
  payment_reference: string | null;
  fulfillment_provider: string | null;
  provider_order_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  notes: string;
  paid_at: string | null;
  shipped_at: string | null;
  shipping_company: string;
  shipping_carrier: string | null;
  customer_notes: string;
  admin_notes: string;
  discount_cents: number;
  payment_provider_payment_id: string | null;
  proof_approved_at: string | null;
  artwork_issue_reason: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  sent_to_maker_at: string | null;
  production_started_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_type: string;
  production_snapshot_id: string | null;
  print_specification_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  product_sku: string | null;
  product_name: string | null;
  width: number | null;
  height: number | null;
  units: "in" | "mm" | null;
  material: string | null;
  finish: string | null;
  created_at: string;
}

export interface OrderEventRow {
  id: number;
  order_id: string;
  previous_status: OrderStatus | null;
  status: OrderStatus;
  note: string;
  actor: string;
  actor_user_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface NotificationEventRow {
  id: string;
  order_id: string | null;
  type: string;
  recipient: string;
  provider: string;
  provider_message_id: string | null;
  status: "sent" | "failed" | "skipped";
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
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
  /** Null for business-created builds that are not claimed yet. */
  owner_username: string | null;
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
  organization_type: OrganizationType;
  website_url: string | null;
  instagram_handle: string | null;
  /** BuildTags confirmed the business identity. Nothing more. */
  verified: boolean;
  location_text: string;
  tagline: string;
}

export interface PublicContributor {
  organization: PublicShop | null;
  roles: VehicleRelationshipType[];
  mod_count: number;
  crew: { name: string; slug: string } | null;
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
  /** True when the outbound link is an affiliate link (the page shows a disclosure). */
  is_affiliate: boolean;
  merchant: string;
  installed_by_text: string;
  installation_date: string | null;
  source_type: ModSourceType;
  verification_status: ModVerificationStatus;
  /** Installer. For owner-added parts this is what the owner reported. */
  shop: PublicShop | null;
  /** The business that recorded this part, when a business did. */
  recorded_by: PublicShop | null;
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
  has_affiliate_links: boolean;
  is_claimed: boolean;
  photos: PublicPhoto[];
  modifications: PublicModification[];
  contributors: PublicContributor[];
  crews: { name: string; slug: string; kind: CrewKind }[];
  vehicle_socials: PublicSocial[];
  owner: PublicOwner | null;
}

export type PublicBuildResult =
  | { access: "ok"; is_owner: boolean; can_manage: boolean; liked: boolean; build: PublicBuild }
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
  affiliate_clicks: number;
  affiliate_clicks_30d: number;
  total_parts: number;
  linked_parts: number;
  monetized_parts: number;
  scans_by_day: { day: string; count: number }[];
  top_parts: { part_name: string; brand: string; count: number; is_affiliate: boolean }[];
  top_socials: { platform: SocialPlatform; handle: string; owner_type: SocialOwnerType; count: number }[];
  devices: Partial<Record<DeviceType, number>>;
  countries: { country: string; count: number }[];
}

/* ---------------------------------------------------------------------------
 * Business payloads (0014 functions)
 * ------------------------------------------------------------------------- */

export interface MyOrganization {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  status: OrganizationStatus;
  verified_status: VerificationStatus;
  logo_url: string | null;
  role: OrgMemberRole;
}

export interface OrgClaimSummary {
  id: string;
  status: ClaimStatus;
  code_hint: string;
  expires_at: string | null;
  created_at: string;
  claimed_at: string | null;
  invite_sent_at: string | null;
}

export interface OrgBuild {
  vehicle_id: string;
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  hero_image_url: string | null;
  visibility: VehicleVisibility;
  status: VehicleStatus;
  ownership_status: OwnershipStatus;
  scan_count: number;
  like_count: number;
  created_at: string;
  mod_count: number;
  org_mod_count: number;
  roles: VehicleRelationshipType[];
  can_edit: boolean;
  qr_code: string | null;
  qr_status: QrStatus | null;
  customer_name: string | null;
  claim: OrgClaimSummary | null;
  in_crew: boolean;
  orders: number;
}

type OrgVehicleRef = { vehicle_id: string; slug: string; year: number | null; make: string; model: string };

export interface OrgDashboard {
  organization: Pick<OrganizationRow, "id" | "name" | "slug" | "status" | "verified_status" | "organization_type">;
  builds_created: number;
  claimed: number;
  awaiting_claim: number;
  active_claims: number;
  buildtags_ordered: number;
  active_buildtags: number;
  total_scans: number;
  documented_mods: number;
  recent_builds: (OrgVehicleRef & { nickname: string; hero_image_url: string | null; ownership_status: OwnershipStatus; created_at: string })[];
  recent_claims: (OrgVehicleRef & { claimed_at: string })[];
  top_scanned: (OrgVehicleRef & { nickname: string; scan_count: number })[];
}

export interface OrgTeamMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: OrgMemberRole;
  status: "active" | "removed";
  created_at: string;
}

export interface OrgOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_cents: number;
  currency: string;
  created_at: string;
  placed_by: string | null;
  quantity: number | null;
  vehicle: { year: number | null; make: string; model: string; nickname: string; slug: string } | null;
}

export interface GeneratedClaim {
  claim_id: string;
  /** Raw secrets: returned once, never stored. */
  token: string;
  code: string;
  expires_at: string | null;
}

export interface ClaimPreview {
  status: "active" | "claimed" | "expired" | "revoked" | "invalid";
  expires_at?: string | null;
  vehicle?: {
    year: number | null;
    make: string;
    model: string;
    trim: string;
    nickname: string;
    hero_image_url: string | null;
    mod_count: number;
    photo_count: number;
  };
  organization?: {
    name: string;
    slug: string;
    logo_url: string | null;
    organization_type: OrganizationType;
    verified_status: VerificationStatus;
  } | null;
}

export type ClaimError = "invalid" | "expired" | "revoked" | "claimed" | "issuer_member" | "rate_limited" | "unconfirmed";

export type ClaimResult =
  | {
      ok: true;
      vehicle_id: string;
      slug: string;
      vehicle: { year: number | null; make: string; model: string; trim: string; nickname: string; hero_image_url: string | null };
      organization: { name: string; slug: string; logo_url: string | null; organization_type: OrganizationType } | null;
      counts: { mods: number; business_mods: number; photos: number; designs: number };
      crew: { id: string; name: string; slug: string; is_member: boolean } | null;
    }
  | { ok: false; error: ClaimError };

export interface PublicOrganizationBuild {
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  hero_image_url: string | null;
  horsepower: number | null;
  horsepower_type: HorsepowerType;
  scan_count: number;
  like_count: number;
  mod_count: number;
  shop_mod_count: number;
  roles: VehicleRelationshipType[];
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  tagline: string;
  description: string;
  logo_url: string | null;
  website_url: string | null;
  phone: string;
  email: string;
  location_text: string;
  city: string;
  region: string;
  country: string;
  instagram_handle: string | null;
  verified: boolean;
  created_at: string;
  socials: { platform: SocialPlatform; handle: string; url: string }[];
  crew: { name: string; slug: string; kind: CrewKind; tagline: string; member_count: number } | null;
  documented_mods: number;
  builds: PublicOrganizationBuild[];
}

export interface VehicleClaimRow {
  id: string;
  vehicle_id: string;
  organization_id: string | null;
  token_hash: string;
  code_hash: string;
  code_hint: string;
  status: ClaimStatus;
  expires_at: string | null;
  recipient_email: string;
  invite_sent_at: string | null;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface VehicleManageContext {
  is_owner: boolean;
  organization: { id: string; name: string; slug: string; organization_type: OrganizationType } | null;
}

export interface BusinessInquiryRow {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  business_type: string;
  industry: string;
  location_count: string;
  builds_per_month: string;
  interests: string[];
  message: string;
  status: BusinessInquiryStatus;
  source: string;
  admin_notes: string;
  submitter_key: string | null;
  submitted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrganizationRow {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  status: OrganizationStatus;
  verified_status: VerificationStatus;
  created_at: string;
  email: string;
  phone: string;
  website_url: string | null;
  location_text: string;
  owner_username: string | null;
  member_count: number;
  build_count: number;
}

export interface AdminOrganizationDetail extends Omit<AdminOrganizationRow, "owner_username" | "member_count" | "build_count"> {
  members: { user_id: string; username: string | null; display_name: string | null; email: string; role: OrgMemberRole; created_at: string }[];
  invites: { id: string; email: string; role: OrgMemberRole; created_at: string }[];
}

/** org_analytics (0016): aggregate counts for a business's builds and parts. */
export interface OrgAnalytics {
  days: number;
  vehicles: number;
  vehicles_scanned: number;
  scans_all_time: number;
  scans: number;
  scans_7d: number;
  scans_today: number;
  parts: number;
  parts_linked: number;
  part_clicks_all_time: number;
  part_clicks: number;
  scans_by_day: { day: string; count: number }[];
  top_parts: { brand: string; part_name: string; category: ModCategory; installs: number; vehicles: number; clicks: number }[];
  categories: { category: ModCategory; installs: number; clicks: number }[];
  top_vehicles: (OrgVehicleRef & { nickname: string; is_public: boolean; ownership_status: OwnershipStatus; scans: number; part_clicks: number })[];
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
      notification_events: Table<NotificationEventRow, InsertOf<NotificationEventRow>, UpdateOf<NotificationEventRow>>;
      organizations: Table<OrganizationRow, InsertOf<OrganizationRow>, UpdateOf<OrganizationRow>>;
      organization_members: Table<
        {
          organization_id: string;
          user_id: string;
          role: OrgMemberRole;
          status: "active" | "removed";
          added_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        },
        { organization_id: string; user_id: string; role?: OrgMemberRole },
        Partial<{ role: OrgMemberRole; status: "active" | "removed" }>
      >;
      vehicle_customer_records: Table<
        {
          vehicle_id: string;
          organization_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          notes: string;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          vehicle_id: string;
          organization_id: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          notes?: string;
          created_by_user_id?: string | null;
        },
        Partial<{ customer_name: string; customer_email: string; customer_phone: string; notes: string }>
      >;
      business_inquiries: Table<BusinessInquiryRow, never, never>;
      vehicle_claims: Table<VehicleClaimRow, never, never>;
      crews: Table<
        { id: string; owner_id: string; name: string; slug: string; tagline: string; organization_id: string | null; kind: CrewKind; created_at: string; updated_at: string },
        never,
        never
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
          | "ownership_status"
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
          | "installed_by_organization_id"
          | "part_id"
          | "installation_date"
          | "sort_order"
          | "created_by_user_id"
          | "created_by_organization_id"
          | "source_type"
          | "verification_status"
          | "work_order_reference"
          | "is_hidden"
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
      print_specifications: Table<PrintSpecificationRow, InsertOf<PrintSpecificationRow>, UpdateOf<PrintSpecificationRow>>;
      tag_production_snapshots: Table<
        ProductionSnapshotRow,
        InsertOf<
          ProductionSnapshotRow,
          "tag_design_id" | "vehicle_id" | "qr_code_id" | "print_specification_id" | "units" | "finish" | "quantity" | "svg_storage_path" | "png_storage_path" | "validation_report"
        >,
        Partial<Record<string, never>>,
        VehicleChild
      >;
      orders: Table<
        OrderRow,
        InsertOf<
          OrderRow,
          | "order_number"
          | "status"
          | "payment_status"
          | "fulfillment_status"
          | "subtotal_cents"
          | "shipping_cents"
          | "tax_cents"
          | "total_cents"
          | "currency"
          | "shipping_name"
          | "shipping_line1"
          | "shipping_line2"
          | "shipping_city"
          | "shipping_state"
          | "shipping_postal_code"
          | "shipping_country"
          | "shipping_phone"
          | "customer_email"
          | "payment_provider"
          | "payment_reference"
          | "fulfillment_provider"
          | "provider_order_id"
          | "tracking_number"
          | "tracking_url"
          | "notes"
          | "paid_at"
          | "shipped_at"
        >,
        UpdateOf<OrderRow>
      >;
      order_items: Table<
        OrderItemRow,
        InsertOf<OrderItemRow, "product_type" | "production_snapshot_id" | "print_specification_id" | "description">,
        UpdateOf<OrderItemRow>
      >;
      order_events: Table<OrderEventRow, InsertOf<OrderEventRow, "note" | "actor">, UpdateOf<OrderEventRow>>;
      /** Append-only; written only through record_legal_acceptance / the signup trigger (0015). */
      legal_acceptances: Table<LegalAcceptanceRow, never, never>;
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
      admin_set_plan: { Args: { p_user_id: string; p_plan: Plan; p_until?: string | null; p_note?: string }; Returns: undefined };
      admin_place_comp_order: { Args: { p_snapshot_id: string; p_user_id: string; p_quantity: number; p_shipping?: Json; p_note?: string }; Returns: string };
      admin_list_members: { Args: { p_query?: string; p_limit?: number }; Returns: Json };
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
      place_order: { Args: { p_snapshot_id: string; p_quantity: number; p_shipping: Json; p_proof_approved?: boolean }; Returns: string };
      billing_mark_order_paid: { Args: { p_token: string; p_order_id: string; p_reference: string | null; p_payment_id?: string | null }; Returns: boolean };
      billing_record_event: { Args: { p_token: string; p_event_id: string; p_event_type: string; p_order_id?: string | null }; Returns: boolean };
      billing_order_summary: { Args: { p_token: string; p_order_id: string }; Returns: Json };
      admin_order_summary: { Args: { p_order_id: string }; Returns: Json };
      record_notification: {
        Args: { p_token: string | null; p_order_id: string | null; p_type: string; p_recipient: string; p_provider: string; p_provider_message_id: string | null; p_status: string; p_error: string | null };
        Returns: undefined;
      };
      order_mark_payment_processing: { Args: { p_order_id: string; p_reference: string }; Returns: undefined };
      admin_set_order_notes: { Args: { p_order_id: string; p_notes: string }; Returns: undefined };
      customer_cancel_order: { Args: { p_order_id: string }; Returns: undefined };
      billing_upsert_subscription: {
        Args: { p_token: string; p_user_id: string; p_plan: Plan; p_status: SubscriptionStatus; p_customer_id: string | null; p_subscription_id: string | null; p_period_end: string | null };
        Returns: undefined;
      };
      billing_user_for_customer: { Args: { p_token: string; p_customer_id: string }; Returns: string | null };
      billing_remember_customer: { Args: { p_customer_id: string }; Returns: undefined };
      scan_leaderboard: { Args: { p_period?: string; p_limit?: number }; Returns: Json };
      create_crew: { Args: { p_name: string; p_tagline?: string }; Returns: Json };
      update_crew: { Args: { p_name: string; p_tagline: string }; Returns: Json };
      crew_add_member: { Args: { p_username: string }; Returns: undefined };
      crew_remove_member: { Args: { p_user_id: string }; Returns: undefined };
      delete_crew: { Args: Record<never, never>; Returns: undefined };
      get_crew: { Args: { p_slug: string }; Returns: Json };
      build_crew: { Args: { p_slug: string }; Returns: Json };
      crew_leaderboard: { Args: { p_period?: string; p_limit?: number }; Returns: Json };
      my_crew: { Args: Record<never, never>; Returns: Json };
      build_owner_plan: { Args: { p_slug: string }; Returns: Plan };
      create_organization: { Args: { p_name: string; p_type: OrganizationType; p_details?: Json }; Returns: OrganizationRow };
      my_organizations: { Args: Record<never, never>; Returns: Json };
      org_team: { Args: { p_org: string }; Returns: Json };
      org_add_member: { Args: { p_org: string; p_username: string; p_role?: OrgMemberRole }; Returns: undefined };
      org_set_member_role: { Args: { p_org: string; p_user_id: string; p_role: OrgMemberRole }; Returns: undefined };
      org_remove_member: { Args: { p_org: string; p_user_id: string }; Returns: undefined };
      org_create_vehicle: {
        Args: { p_org: string; p_vehicle: Json; p_roles?: VehicleRelationshipType[]; p_customer?: Json | null; p_add_to_crew?: boolean };
        Returns: string;
      };
      org_builds: { Args: { p_org: string }; Returns: Json };
      org_dashboard: { Args: { p_org: string }; Returns: Json };
      org_orders: { Args: { p_org: string }; Returns: Json };
      org_create_crew: { Args: { p_org: string; p_name: string; p_tagline?: string; p_kind?: CrewKind }; Returns: Json };
      org_update_crew: { Args: { p_org: string; p_name: string; p_tagline: string; p_kind?: CrewKind | null }; Returns: Json };
      org_associate_build: { Args: { p_org: string; p_vehicle_id: string }; Returns: undefined };
      remove_crew_build: { Args: { p_crew_id: string; p_vehicle_id: string }; Returns: undefined };
      join_crew: { Args: { p_crew_id: string }; Returns: undefined };
      leave_crew: { Args: { p_crew_id: string }; Returns: undefined };
      my_business_crews: { Args: Record<never, never>; Returns: Json };
      vehicle_manage_context: { Args: { p_vehicle_id: string }; Returns: Json };
      generate_vehicle_claim: { Args: { p_vehicle_id: string; p_expires_in_days?: number; p_recipient_email?: string }; Returns: Json };
      revoke_vehicle_claim: { Args: { p_claim_id: string }; Returns: undefined };
      record_claim_invite: { Args: { p_claim_id: string }; Returns: undefined };
      claim_preview: { Args: { p_token: string }; Returns: Json };
      claim_vehicle: { Args: { p_token?: string | null; p_code?: string | null }; Returns: Json };
      get_public_organization: { Args: { p_slug: string }; Returns: Json };
      submit_business_inquiry: { Args: { p: Json; p_submitter_key?: string | null }; Returns: string };
      admin_update_business_inquiry: {
        Args: { p_id: string; p_status?: BusinessInquiryStatus | null; p_notes?: string | null };
        Returns: undefined;
      };
      admin_list_organizations: { Args: { p_query?: string }; Returns: Json };
      admin_set_organization: {
        Args: { p_org: string; p_status?: OrganizationStatus | null; p_verified?: VerificationStatus | null; p_type?: OrganizationType | null };
        Returns: undefined;
      };
      admin_create_organization: {
        Args: {
          p_name: string;
          p_type?: OrganizationType;
          p_owner?: string;
          p_status?: OrganizationStatus;
          p_verified?: VerificationStatus;
          p_details?: Json;
          p_add_self?: OrgMemberRole | null;
        };
        Returns: Json;
      };
      admin_add_org_member: { Args: { p_org: string; p_identifier: string; p_role?: OrgMemberRole }; Returns: string };
      admin_set_org_member: { Args: { p_org: string; p_user_id: string; p_role?: OrgMemberRole | null; p_remove?: boolean }; Returns: undefined };
      admin_revoke_org_invite: { Args: { p_invite_id: string }; Returns: undefined };
      admin_organization_detail: { Args: { p_org: string }; Returns: Json };
      org_analytics: { Args: { p_org: string; p_days?: number }; Returns: Json };
      record_legal_acceptance: {
        Args: {
          p_document_type: LegalDocumentType;
          p_document_version: string;
          p_context: string;
          p_subject_type?: string | null;
          p_subject_id?: string | null;
          p_related?: Json;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
      my_legal_status: {
        Args: Record<never, never>;
        Returns: { document_type: LegalDocumentType; document_version: string; accepted_at: string }[];
      };
      admin_set_order_status: {
        Args: {
          p_order_id: string;
          p_status: OrderStatus;
          p_note?: string;
          p_tracking_number?: string | null;
          p_tracking_url?: string | null;
          p_provider_order_id?: string | null;
          p_carrier?: string | null;
          p_reason?: string | null;
        };
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
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      fulfillment_status: FulfillmentStatus;
      validation_status: ValidationStatus;
      size_unit: "in" | "mm";
      organization_type: OrganizationType;
      organization_status: OrganizationStatus;
      verification_status: VerificationStatus;
      org_member_role: OrgMemberRole;
      vehicle_relationship_type: VehicleRelationshipType;
      vehicle_ownership_status: OwnershipStatus;
      vehicle_claim_status: ClaimStatus;
      mod_source_type: ModSourceType;
      mod_verification_status: ModVerificationStatus;
      crew_kind: CrewKind;
      business_inquiry_status: BusinessInquiryStatus;
      legal_document_type: LegalDocumentType;
    };
    CompositeTypes: Record<never, never>;
  };
}
