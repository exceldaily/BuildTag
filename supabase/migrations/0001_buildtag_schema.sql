-- =============================================================================
-- BuildTag - schema, enums, tables, indexes
-- =============================================================================
-- BuildTag owns exactly one schema (`buildtag`) inside a Supabase project.
-- It shares Supabase Auth (auth.users) with the project; every BuildTag row is
-- keyed to auth.uid(). Functions live in 0002, RLS + storage + PostgREST
-- exposure in 0003.
--
-- Design rules baked into the schema:
--   * Physical decals encode a PERMANENT short code (qr_codes.code), never a
--     slug. Slugs, usernames and ownership can all change without reprinting.
--   * Public surfaces never expose database ids. Modifications and social
--     links carry a random `public_id` for outbound-click tracking.
--   * Analytics rows store no personal data (no IP, no user agent string).
-- =============================================================================

create schema if not exists buildtag;

grant usage on schema buildtag to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enums (mirrored in src/lib/types.ts)
-- -----------------------------------------------------------------------------

create type buildtag.social_owner_type as enum ('profile', 'vehicle', 'shop');

create type buildtag.social_platform as enum (
  'instagram', 'tiktok', 'youtube', 'facebook', 'x', 'threads',
  'twitch', 'discord', 'website', 'other'
);

create type buildtag.horsepower_type as enum ('HP', 'WHP');
create type buildtag.torque_unit as enum ('LB_FT', 'NM');
create type buildtag.mileage_unit as enum ('MI', 'KM');

create type buildtag.vehicle_visibility as enum ('public', 'unlisted', 'private');
create type buildtag.vehicle_status as enum ('active', 'disabled');
create type buildtag.qr_status as enum ('active', 'disabled');

create type buildtag.mod_category as enum (
  'engine', 'forced_induction', 'intake', 'exhaust', 'fuel_system', 'cooling',
  'ecu_tuning', 'transmission', 'drivetrain', 'suspension', 'brakes', 'wheels',
  'tires', 'exterior', 'interior', 'lighting', 'audio', 'electronics', 'safety',
  'weight_reduction', 'aero', 'other'
);

create type buildtag.report_reason as enum (
  'spam', 'inappropriate', 'copyright', 'impersonation', 'other'
);
create type buildtag.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type buildtag.plan as enum ('free', 'pro');
create type buildtag.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

create type buildtag.device_type as enum ('mobile', 'tablet', 'desktop', 'other');

-- -----------------------------------------------------------------------------
-- Helpers used by defaults / triggers
-- -----------------------------------------------------------------------------

create or replace function buildtag.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Random, non-sequential, human-transcribable code. Alphabet omits 0/O/1/I.
-- 8 chars over a 32-symbol alphabet = 40 bits of entropy.
create or replace function buildtag.short_code(p_len integer default 8)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(p_len);
  out_text text := '';
  i integer;
begin
  for i in 0 .. p_len - 1 loop
    out_text := out_text || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return out_text;
end;
$$;

create or replace function buildtag.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(p_text, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user, created lazily on first dashboard visit)
-- -----------------------------------------------------------------------------

create table buildtag.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  location_text text not null default '',
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_display_name_len check (char_length(display_name) <= 60),
  constraint profiles_bio_len check (char_length(bio) <= 600),
  constraint profiles_location_len check (char_length(location_text) <= 80)
);

create unique index profiles_username_unique on buildtag.profiles (lower(username));

create trigger profiles_set_updated_at
  before update on buildtag.profiles
  for each row execute function buildtag.set_updated_at();

-- Admins: membership table checked by buildtag.is_admin() (0002). Rows are
-- inserted by an operator with database access, never through the API.
create table buildtag.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Monetization architecture (no checkout yet). One row per user, optional.
-- -----------------------------------------------------------------------------

create table buildtag.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan buildtag.plan not null default 'free',
  status buildtag.subscription_status not null default 'active',
  provider text,                       -- e.g. 'stripe'
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on buildtag.subscriptions
  for each row execute function buildtag.set_updated_at();

-- -----------------------------------------------------------------------------
-- Shops (performance shops / installers). Minimal for MVP.
-- -----------------------------------------------------------------------------

create table buildtag.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  description text not null default '' check (char_length(description) <= 1000),
  website_url text,
  location_text text not null default '' check (char_length(location_text) <= 80),
  instagram_handle text check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shops_owner_idx on buildtag.shops (owner_id);

create trigger shops_set_updated_at
  before update on buildtag.shops
  for each row execute function buildtag.set_updated_at();

-- -----------------------------------------------------------------------------
-- Parts (future standardized parts database). Read-only for users in MVP.
-- -----------------------------------------------------------------------------

create table buildtag.parts (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (char_length(brand) between 1 and 80),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  part_number text,
  category buildtag.mod_category not null default 'other',
  description text not null default '',
  image_url text,
  manufacturer_url text,
  created_at timestamptz not null default now()
);

create index parts_brand_name_idx on buildtag.parts (lower(brand), lower(name));
create index parts_name_trgm_idx on buildtag.parts using gin ((brand || ' ' || name) extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Vehicles
-- -----------------------------------------------------------------------------

create table buildtag.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  year integer check (year is null or year between 1900 and 2100),
  make text not null check (char_length(make) between 1 and 60),
  model text not null check (char_length(model) between 1 and 60),
  trim text not null default '' check (char_length(trim) <= 60),
  nickname text not null default '' check (char_length(nickname) <= 40),
  description text not null default '' check (char_length(description) <= 3000),
  hero_image_url text,
  profile_image_url text,
  location_text text not null default '' check (char_length(location_text) <= 80),
  horsepower integer check (horsepower is null or horsepower between 0 and 10000),
  horsepower_type buildtag.horsepower_type not null default 'WHP',
  torque integer check (torque is null or torque between 0 and 20000),
  torque_unit buildtag.torque_unit not null default 'LB_FT',
  mileage integer check (mileage is null or mileage between 0 and 5000000),
  mileage_unit buildtag.mileage_unit not null default 'MI',
  build_started_year integer check (build_started_year is null or build_started_year between 1900 and 2100),
  build_cost numeric(12, 2) check (build_cost is null or build_cost >= 0),
  build_cost_public boolean not null default false,
  dyno_type text not null default '' check (char_length(dyno_type) <= 60),
  visibility buildtag.vehicle_visibility not null default 'public',
  status buildtag.vehicle_status not null default 'active',
  show_owner_section boolean not null default true,
  -- Denormalized counters maintained by triggers (0002). Cheap to read on
  -- dashboard cards and explore listings.
  mod_count integer not null default 0,
  like_count integer not null default 0,
  scan_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_owner_idx on buildtag.vehicles (owner_id);
create index vehicles_visibility_idx on buildtag.vehicles (visibility, status);
create index vehicles_explore_created_idx on buildtag.vehicles (created_at desc) where visibility = 'public' and status = 'active';
create index vehicles_explore_scans_idx on buildtag.vehicles (scan_count desc) where visibility = 'public' and status = 'active';
create index vehicles_explore_likes_idx on buildtag.vehicles (like_count desc) where visibility = 'public' and status = 'active';
create index vehicles_make_model_idx on buildtag.vehicles (lower(make), lower(model));

create trigger vehicles_set_updated_at
  before update on buildtag.vehicles
  for each row execute function buildtag.set_updated_at();

-- -----------------------------------------------------------------------------
-- Vehicle photos (objects live in the `buildtag-photos` storage bucket)
-- -----------------------------------------------------------------------------

create table buildtag.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  -- Folder prefix inside the bucket: "<vehicle_id>/<photo_id>". The app derives
  -- "<storage_path>/full.webp" and "<storage_path>/thumb.webp".
  storage_path text not null,
  caption text not null default '' check (char_length(caption) <= 200),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_photos_vehicle_idx on buildtag.vehicle_photos (vehicle_id, sort_order);

-- -----------------------------------------------------------------------------
-- Modifications
-- -----------------------------------------------------------------------------

create table buildtag.modifications (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  public_id text not null default buildtag.short_code(10),
  category buildtag.mod_category not null default 'other',
  brand text not null default '' check (char_length(brand) <= 80),
  part_name text not null check (char_length(part_name) between 1 and 120),
  part_number text not null default '' check (char_length(part_number) <= 80),
  description text not null default '' check (char_length(description) <= 1000),
  price numeric(12, 2) check (price is null or price >= 0),
  price_public boolean not null default false,
  product_url text,
  affiliate_url text,
  merchant text not null default '' check (char_length(merchant) <= 80),
  affiliate_network text not null default '' check (char_length(affiliate_network) <= 80),
  installed_by_text text not null default '' check (char_length(installed_by_text) <= 120),
  shop_id uuid references buildtag.shops (id) on delete set null,
  part_id uuid references buildtag.parts (id) on delete set null,
  installation_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index modifications_public_id_unique on buildtag.modifications (public_id);
create index modifications_vehicle_idx on buildtag.modifications (vehicle_id, category, sort_order);
create index modifications_part_idx on buildtag.modifications (part_id) where part_id is not null;
create index modifications_shop_idx on buildtag.modifications (shop_id) where shop_id is not null;

create trigger modifications_set_updated_at
  before update on buildtag.modifications
  for each row execute function buildtag.set_updated_at();

-- -----------------------------------------------------------------------------
-- Social links (profile, vehicle and shop accounts are kept separate)
-- -----------------------------------------------------------------------------

create table buildtag.social_links (
  id uuid primary key default gen_random_uuid(),
  public_id text not null default buildtag.short_code(10),
  owner_type buildtag.social_owner_type not null,
  owner_id uuid not null,
  platform buildtag.social_platform not null,
  handle text not null default '' check (char_length(handle) <= 80),
  url text not null check (url ~* '^https://' and char_length(url) <= 500),
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index social_links_public_id_unique on buildtag.social_links (public_id);
create index social_links_owner_idx on buildtag.social_links (owner_type, owner_id, sort_order);

-- -----------------------------------------------------------------------------
-- Permanent QR codes. One active code per vehicle is created automatically on
-- vehicle insert (0002). Codes are never re-issued; admins can disable one.
-- -----------------------------------------------------------------------------

create table buildtag.qr_codes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  code text not null check (code ~ '^[A-HJ-NP-Z2-9]{6,12}$'),
  status buildtag.qr_status not null default 'active',
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index qr_codes_code_unique on buildtag.qr_codes (code);
create index qr_codes_vehicle_idx on buildtag.qr_codes (vehicle_id);

-- -----------------------------------------------------------------------------
-- Analytics events (no personal data)
-- -----------------------------------------------------------------------------

create table buildtag.scan_events (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  qr_code_id uuid references buildtag.qr_codes (id) on delete set null,
  occurred_at timestamptz not null default now(),
  referrer text,                 -- host only, never full URL
  country text,                  -- ISO-3166 alpha-2 from the edge header
  device_type buildtag.device_type not null default 'other'
);

create index scan_events_vehicle_time_idx on buildtag.scan_events (vehicle_id, occurred_at desc);
create index scan_events_time_idx on buildtag.scan_events (occurred_at desc);

create table buildtag.product_clicks (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  modification_id uuid references buildtag.modifications (id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index product_clicks_vehicle_time_idx on buildtag.product_clicks (vehicle_id, occurred_at desc);
create index product_clicks_mod_idx on buildtag.product_clicks (modification_id);

create table buildtag.social_clicks (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  social_link_id uuid references buildtag.social_links (id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index social_clicks_vehicle_time_idx on buildtag.social_clicks (vehicle_id, occurred_at desc);

-- Anonymous likes. visitor_key is an HMAC computed server-side from a
-- first-party visitor cookie + coarse network info; it is not reversible.
create table buildtag.build_likes (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  visitor_key text not null check (char_length(visitor_key) between 16 and 128),
  created_at timestamptz not null default now()
);

create unique index build_likes_unique on buildtag.build_likes (vehicle_id, visitor_key);
create index build_likes_time_idx on buildtag.build_likes (vehicle_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Reports (moderation queue)
-- -----------------------------------------------------------------------------

create table buildtag.reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  reason buildtag.report_reason not null,
  description text not null default '' check (char_length(description) <= 1000),
  status buildtag.report_status not null default 'open',
  reporter_key text,             -- same HMAC scheme as likes; rate limiting only
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on buildtag.reports (status, created_at desc);
create index reports_vehicle_idx on buildtag.reports (vehicle_id);

create trigger reports_set_updated_at
  before update on buildtag.reports
  for each row execute function buildtag.set_updated_at();

-- -----------------------------------------------------------------------------
-- Saved BuildTag decal designs (many per vehicle, all share the same QR)
-- -----------------------------------------------------------------------------

create table buildtag.tag_designs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  name text not null default 'My BuildTag' check (char_length(name) between 1 and 60),
  template text not null default 'stealth',
  shape text not null default 'rounded',
  style text not null default 'minimal',
  configuration_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tag_designs_vehicle_idx on buildtag.tag_designs (vehicle_id, updated_at desc);

create trigger tag_designs_set_updated_at
  before update on buildtag.tag_designs
  for each row execute function buildtag.set_updated_at();
