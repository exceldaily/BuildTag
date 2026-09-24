-- =============================================================================
-- 0014: organizations, vehicle relationships, unclaimed vehicles, secure claims,
--       modification provenance, business crews, business-purchased tags,
--       business inquiries.
-- =============================================================================
-- The vehicle is the long-lived entity. Owners, creators, builders, dealers
-- and installers are temporal relationships around it:
--
--   * vehicles.owner_id stays as the denormalized CURRENT owner (null while a
--     business-created vehicle is unclaimed) so every existing owner policy
--     keeps working. vehicle_relationships is the history and the source of
--     every non-owner role. At most one active OWNER per vehicle is enforced
--     by a unique index; owner_id can only change through claim_vehicle()
--     (or an admin), enforced by a trigger.
--   * A public BuildTag QR never proves ownership. Claims use a separate
--     256-bit token (URL) plus a short manual code; only SHA-256 hashes are
--     stored, never the raw values.
--   * Business-recorded modifications keep their provenance forever. The
--     owner can hide them, never rewrite or delete them.
--   * The permanent QR belongs to the vehicle and is untouched by any of this.
--
-- "Verified" on an organization only means BuildTags verified the business's
-- identity. It never implies manufacturer approval.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums (mirrored in src/lib/types.ts)
-- -----------------------------------------------------------------------------
create type buildtag.organization_type as enum (
  'dealership', 'custom_shop', 'performance_shop', 'motorcycle_shop', 'installer', 'tuner', 'manufacturer', 'dealer_group', 'other'
);
create type buildtag.organization_status as enum ('pending', 'active', 'suspended');
create type buildtag.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type buildtag.org_member_role as enum ('owner', 'admin', 'manager', 'staff');
create type buildtag.org_member_status as enum ('active', 'removed');
create type buildtag.vehicle_relationship_type as enum ('owner', 'creator', 'builder', 'dealer', 'installer', 'tuner', 'sponsor');
create type buildtag.vehicle_ownership_status as enum ('unclaimed', 'claim_pending', 'claimed', 'transfer_pending');
create type buildtag.vehicle_claim_status as enum ('active', 'claimed', 'expired', 'revoked');
create type buildtag.mod_source_type as enum ('owner', 'shop', 'dealer', 'manufacturer', 'import');
create type buildtag.mod_verification_status as enum ('owner_reported', 'shop_recorded', 'dealer_recorded', 'manufacturer_recorded');
create type buildtag.crew_kind as enum ('riding', 'shop', 'dealership', 'brand', 'customer');
create type buildtag.business_inquiry_status as enum ('new', 'contacted', 'qualified', 'pilot', 'customer', 'closed', 'spam');

-- -----------------------------------------------------------------------------
-- Organizations: the old minimal `shops` table becomes the organization record
-- (same ids, so existing installer links survive).
-- -----------------------------------------------------------------------------
alter table buildtag.shops rename to organizations;
alter index buildtag.shops_owner_idx rename to organizations_created_by_idx;
alter trigger shops_set_updated_at on buildtag.organizations rename to organizations_set_updated_at;
alter table buildtag.organizations rename column owner_id to created_by_user_id;

alter table buildtag.organizations
  add column organization_type buildtag.organization_type not null default 'other',
  add column status buildtag.organization_status not null default 'pending',
  add column verified_status buildtag.verification_status not null default 'unverified',
  add column tagline text not null default '' check (char_length(tagline) <= 140),
  add column phone text not null default '' check (char_length(phone) <= 40),
  add column email text not null default '' check (char_length(email) <= 200),
  add column address_line1 text not null default '' check (char_length(address_line1) <= 200),
  add column city text not null default '' check (char_length(city) <= 80),
  add column region text not null default '' check (char_length(region) <= 80),
  add column postal_code text not null default '' check (char_length(postal_code) <= 20),
  add column country text not null default 'US' check (country ~ '^[A-Z]{2}$');

-- Rows that already existed were created by BuildTags operators: keep them live.
update buildtag.organizations
   set status = 'active',
       verified_status = case when verified then 'verified'::buildtag.verification_status else 'unverified'::buildtag.verification_status end;
alter table buildtag.organizations drop column verified;

create index organizations_status_idx on buildtag.organizations (status);

create table buildtag.organization_members (
  organization_id uuid not null references buildtag.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role buildtag.org_member_role not null default 'staff',
  status buildtag.org_member_status not null default 'active',
  added_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on buildtag.organization_members (user_id) where status = 'active';
create trigger organization_members_set_updated_at before update on buildtag.organization_members for each row execute function buildtag.set_updated_at();

-- Whoever created an existing shop row becomes its owner.
insert into buildtag.organization_members (organization_id, user_id, role)
select id, created_by_user_id, 'owner' from buildtag.organizations where created_by_user_id is not null
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Authorization helpers
-- -----------------------------------------------------------------------------
create or replace function buildtag.org_role_rank(p_role buildtag.org_member_role)
returns integer language sql immutable set search_path = ''
as $$
  select case p_role when 'owner' then 4 when 'admin' then 3 when 'manager' then 2 else 1 end;
$$;

-- Active member of an ACTIVE-or-pending organization with at least p_min role.
create or replace function buildtag.is_org_member(p_org uuid, p_min buildtag.org_member_role default 'staff')
returns boolean language sql security definer stable set search_path = ''
as $$
  select p_org is not null and exists (
    select 1 from buildtag.organization_members m
     where m.organization_id = p_org and m.user_id = (select auth.uid()) and m.status = 'active'
       and buildtag.org_role_rank(m.role) >= buildtag.org_role_rank(p_min)
  );
$$;
revoke execute on function buildtag.is_org_member(uuid, buildtag.org_member_role) from public;
grant execute on function buildtag.is_org_member(uuid, buildtag.org_member_role) to authenticated;

-- Organization may do business work (create builds, claims, orders) only once
-- a BuildTags admin has activated it.
create or replace function buildtag.org_can_work(p_org uuid, p_min buildtag.org_member_role default 'staff')
returns boolean language sql security definer stable set search_path = ''
as $$
  select buildtag.is_org_member(p_org, p_min)
     and exists (select 1 from buildtag.organizations o where o.id = p_org and o.status = 'active');
$$;
revoke execute on function buildtag.org_can_work(uuid, buildtag.org_member_role) from public;
grant execute on function buildtag.org_can_work(uuid, buildtag.org_member_role) to authenticated;

-- Legacy name kept for owns_social_owner('shop', ...): org admins manage org socials.
create or replace function buildtag.owns_shop(p_shop_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select buildtag.is_org_member(p_shop_id, 'admin');
$$;

-- -----------------------------------------------------------------------------
-- Organization RLS: public profile fields are readable by signed-in users (the
-- installer picker); anon reads go through get_public_organization().
-- -----------------------------------------------------------------------------
drop policy if exists shops_select_authenticated on buildtag.organizations;
drop policy if exists shops_insert_own on buildtag.organizations;
drop policy if exists shops_update_own on buildtag.organizations;
drop policy if exists shops_delete_own on buildtag.organizations;

create policy organizations_select on buildtag.organizations for select to authenticated
  using (status = 'active' or buildtag.is_org_member(id, 'staff') or buildtag.is_admin());
create policy organizations_update on buildtag.organizations for update to authenticated
  using (buildtag.is_org_member(id, 'admin') or buildtag.is_admin())
  with check (buildtag.is_org_member(id, 'admin') or buildtag.is_admin());
create policy organizations_delete on buildtag.organizations for delete to authenticated using (buildtag.is_admin());
-- inserts go through create_organization()
revoke insert on buildtag.organizations from authenticated;

-- Status, verification, creator and slug are operator-controlled.
create or replace function buildtag.organizations_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() and (select auth.uid()) is not null then
    new.status := old.status;
    new.verified_status := old.verified_status;
    new.created_by_user_id := old.created_by_user_id;
    new.slug := old.slug;
  end if;
  return new;
end;
$$;
create trigger organizations_guard before update on buildtag.organizations for each row execute function buildtag.organizations_guard();

alter table buildtag.organization_members enable row level security;
grant select on buildtag.organization_members to authenticated;
create policy organization_members_select on buildtag.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or buildtag.is_org_member(organization_id, 'staff') or buildtag.is_admin());
-- writes go through the org_* functions below

-- -----------------------------------------------------------------------------
-- Vehicles: nullable current owner + ownership status
-- -----------------------------------------------------------------------------
alter table buildtag.vehicles alter column owner_id drop not null;
alter table buildtag.vehicles add column ownership_status buildtag.vehicle_ownership_status not null default 'claimed';
alter table buildtag.vehicles add constraint vehicles_owner_matches_status
  check ((owner_id is null) = (ownership_status in ('unclaimed', 'claim_pending')));
create index vehicles_ownership_idx on buildtag.vehicles (ownership_status) where owner_id is null;

-- -----------------------------------------------------------------------------
-- Vehicle relationships (temporal)
-- -----------------------------------------------------------------------------
create table buildtag.vehicle_relationships (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  relationship_type buildtag.vehicle_relationship_type not null,
  user_id uuid references auth.users (id) on delete set null,
  organization_id uuid references buildtag.organizations (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vehicle_relationships_party check (relationship_type = 'owner' or user_id is not null or organization_id is not null),
  constraint vehicle_relationships_owner_is_user check (relationship_type <> 'owner' or organization_id is null),
  constraint vehicle_relationships_ended check ((status = 'ended') = (ended_at is not null))
);
-- Database-level guarantee: one current owner per vehicle.
create unique index vehicle_relationships_one_owner on buildtag.vehicle_relationships (vehicle_id)
  where relationship_type = 'owner' and ended_at is null;
create unique index vehicle_relationships_one_org_role on buildtag.vehicle_relationships (vehicle_id, relationship_type, organization_id)
  where organization_id is not null and ended_at is null;
create index vehicle_relationships_vehicle_idx on buildtag.vehicle_relationships (vehicle_id) where ended_at is null;
create index vehicle_relationships_org_idx on buildtag.vehicle_relationships (organization_id, relationship_type) where ended_at is null;
create index vehicle_relationships_user_idx on buildtag.vehicle_relationships (user_id) where ended_at is null;

-- Existing vehicles: their owner is also their creator.
insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, user_id, started_at, created_by_user_id, metadata)
select v.id, 'owner', v.owner_id, v.created_at, v.owner_id, '{"via":"migration_0014"}'::jsonb from buildtag.vehicles v where v.owner_id is not null;
insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, user_id, started_at, created_by_user_id, metadata)
select v.id, 'creator', v.owner_id, v.created_at, v.owner_id, '{"via":"migration_0014"}'::jsonb from buildtag.vehicles v where v.owner_id is not null;

alter table buildtag.vehicle_relationships enable row level security;
grant select on buildtag.vehicle_relationships to authenticated;
-- visible to the current owner, members of the related organization, admins
create policy vehicle_relationships_select on buildtag.vehicle_relationships for select to authenticated
  using (
    exists (select 1 from buildtag.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()))
    or buildtag.is_org_member(organization_id, 'staff')
    or user_id = (select auth.uid())
    or buildtag.is_admin()
  );

-- An organization manages an UNCLAIMED vehicle it created/builds/sells.
-- After a claim the owner is in charge; the business keeps its own records.
create or replace function buildtag.org_manages_vehicle(p_vehicle_id uuid, p_min buildtag.org_member_role default 'staff')
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1 from buildtag.vehicles v
      join buildtag.vehicle_relationships r on r.vehicle_id = v.id
     where v.id = p_vehicle_id and v.owner_id is null
       and r.ended_at is null and r.organization_id is not null
       and r.relationship_type in ('creator', 'builder', 'dealer')
       and buildtag.org_can_work(r.organization_id, p_min)
  );
$$;
revoke execute on function buildtag.org_manages_vehicle(uuid, buildtag.org_member_role) from public;
grant execute on function buildtag.org_manages_vehicle(uuid, buildtag.org_member_role) to authenticated;

-- owns_vehicle() now means "may manage this vehicle": its current owner, or a
-- member of the business that manages it while unclaimed. Every child-table
-- policy (photos, mods, designs, socials, QR read, storage) uses it.
create or replace function buildtag.owns_vehicle(p_vehicle_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from buildtag.vehicles v where v.id = p_vehicle_id and v.owner_id = (select auth.uid()))
      or buildtag.org_manages_vehicle(p_vehicle_id, 'staff');
$$;

create or replace function buildtag.owns_storage_vehicle(p_object_name text)
returns boolean language plpgsql security definer stable set search_path = ''
as $$
declare
  first_segment text := split_part(p_object_name, '/', 1);
begin
  if first_segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return buildtag.owns_vehicle(first_segment::uuid);
end;
$$;

drop policy if exists vehicles_select_own_or_admin on buildtag.vehicles;
drop policy if exists vehicles_update_own on buildtag.vehicles;
drop policy if exists vehicles_delete_own on buildtag.vehicles;
create policy vehicles_select on buildtag.vehicles for select to authenticated
  using (owner_id = (select auth.uid()) or buildtag.org_manages_vehicle(id, 'staff') or buildtag.is_admin());
create policy vehicles_update on buildtag.vehicles for update to authenticated
  using (owner_id = (select auth.uid()) or buildtag.org_manages_vehicle(id, 'staff'))
  with check (owner_id = (select auth.uid()) or buildtag.org_manages_vehicle(id, 'staff'));
create policy vehicles_delete on buildtag.vehicles for delete to authenticated
  using (owner_id = (select auth.uid()) or buildtag.org_manages_vehicle(id, 'manager'));

-- Ownership changes only through claim_vehicle() (which raises a transaction-
-- local flag) or a BuildTags admin. Blocks owners handing vehicles away and
-- business staff making themselves owner.
create or replace function buildtag.vehicles_guard_ownership()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (new.owner_id is distinct from old.owner_id or new.ownership_status is distinct from old.ownership_status)
     and coalesce(current_setting('buildtag.ownership_change', true), '') <> 'on'
     and not buildtag.is_admin() then
    raise exception 'Ownership changes go through the claim flow.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger vehicles_guard_ownership before update on buildtag.vehicles for each row execute function buildtag.vehicles_guard_ownership();

-- Keeps the OWNER relationship history in step with owner_id.
create or replace function buildtag.vehicles_sync_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    update buildtag.vehicle_relationships
       set status = 'ended', ended_at = now()
     where vehicle_id = new.id and relationship_type = 'owner' and ended_at is null;
    if new.owner_id is not null then
      insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, user_id, created_by_user_id, metadata)
      values (new.id, 'owner', new.owner_id, (select auth.uid()),
              jsonb_build_object('via', coalesce(nullif(current_setting('buildtag.ownership_via', true), ''), 'update')));
    end if;
  end if;
  return new;
end;
$$;
create trigger vehicles_sync_owner after update of owner_id on buildtag.vehicles for each row execute function buildtag.vehicles_sync_owner();

-- Insert: plan limit applies to owner-created vehicles only; business-created
-- vehicles (owner_id null) come exclusively from org_create_vehicle().
create or replace function buildtag.vehicles_before_insert()
returns trigger language plpgsql set search_path = ''
as $$
declare
  owner_plan buildtag.plan;
  max_vehicles integer;
  current_count integer;
begin
  if new.slug is null or new.slug = '' then
    new.slug := buildtag.generate_vehicle_slug(new.year, new.make, new.model, new.nickname);
  end if;
  if new.owner_id is null then
    if coalesce(current_setting('buildtag.org_create', true), '') <> 'on' then
      raise exception 'Unclaimed vehicles are created by businesses.' using errcode = '42501';
    end if;
    new.ownership_status := 'unclaimed';
    return new;
  end if;
  new.ownership_status := 'claimed';
  owner_plan := buildtag.user_plan(new.owner_id);
  max_vehicles := (buildtag.plan_limits(owner_plan) ->> 'vehicles')::integer;
  select count(*) into current_count from buildtag.vehicles v where v.owner_id = new.owner_id;
  if current_count >= max_vehicles and not buildtag.is_admin() then
    raise exception 'vehicle limit reached for plan %', owner_plan using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Birth: permanent QR (unchanged) + owner/creator relationships for owner-created vehicles.
create or replace function buildtag.vehicles_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  attempt integer := 0;
begin
  loop
    begin
      insert into buildtag.qr_codes (vehicle_id, code) values (new.id, buildtag.short_code(8));
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 5 then
        raise;
      end if;
    end;
  end loop;
  if new.owner_id is not null then
    insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, user_id, created_by_user_id, metadata)
    values (new.id, 'owner', new.owner_id, new.owner_id, '{"via":"created"}'::jsonb),
           (new.id, 'creator', new.owner_id, new.owner_id, '{"via":"created"}'::jsonb);
  end if;
  return new;
end;
$$;

-- Photo / design limits: business-managed vehicles get the Pro allowance.
create or replace function buildtag.vehicle_photos_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid;
  max_photos integer;
  current_count integer;
begin
  select v.owner_id into owner from buildtag.vehicles v where v.id = new.vehicle_id;
  max_photos := (buildtag.plan_limits(case when owner is null then 'pro'::buildtag.plan else buildtag.user_plan(owner) end) ->> 'photos')::integer;
  select count(*) into current_count from buildtag.vehicle_photos p where p.vehicle_id = new.vehicle_id;
  if current_count >= max_photos then
    raise exception 'photo limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function buildtag.tag_designs_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid;
  max_designs integer;
  current_count integer;
begin
  select v.owner_id into owner from buildtag.vehicles v where v.id = new.vehicle_id;
  max_designs := (buildtag.plan_limits(case when owner is null then 'pro'::buildtag.plan else buildtag.user_plan(owner) end) ->> 'designs')::integer;
  select count(*) into current_count from buildtag.tag_designs d where d.vehicle_id = new.vehicle_id;
  if current_count >= max_designs then
    raise exception 'design limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Private customer/delivery details a business keeps for its own builds.
-- Never public, never visible to the owner or other businesses.
-- -----------------------------------------------------------------------------
create table buildtag.vehicle_customer_records (
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  organization_id uuid not null references buildtag.organizations (id) on delete cascade,
  customer_name text not null default '' check (char_length(customer_name) <= 120),
  customer_email text not null default '' check (char_length(customer_email) <= 200),
  customer_phone text not null default '' check (char_length(customer_phone) <= 40),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vehicle_id, organization_id)
);
create trigger vehicle_customer_records_set_updated_at before update on buildtag.vehicle_customer_records for each row execute function buildtag.set_updated_at();
alter table buildtag.vehicle_customer_records enable row level security;
grant select, insert, update, delete on buildtag.vehicle_customer_records to authenticated;
create policy vehicle_customer_records_rw on buildtag.vehicle_customer_records for all to authenticated
  using (buildtag.is_org_member(organization_id, 'staff') or buildtag.is_admin())
  with check (buildtag.org_can_work(organization_id, 'staff'));

-- -----------------------------------------------------------------------------
-- Modification provenance
-- -----------------------------------------------------------------------------
alter table buildtag.modifications rename column shop_id to installed_by_organization_id;
alter index buildtag.modifications_shop_idx rename to modifications_installed_by_idx;
alter table buildtag.modifications
  add column created_by_user_id uuid references auth.users (id) on delete set null,
  add column created_by_organization_id uuid references buildtag.organizations (id) on delete set null,
  add column source_type buildtag.mod_source_type not null default 'owner',
  add column verification_status buildtag.mod_verification_status not null default 'owner_reported',
  add column work_order_reference text not null default '' check (char_length(work_order_reference) <= 80),
  add column is_hidden boolean not null default false;
create index modifications_created_by_org_idx on buildtag.modifications (created_by_organization_id) where created_by_organization_id is not null;

update buildtag.modifications m set created_by_user_id = v.owner_id from buildtag.vehicles v where v.id = m.vehicle_id;

create or replace function buildtag.org_source_type(p_type buildtag.organization_type)
returns buildtag.mod_source_type language sql immutable set search_path = ''
as $$
  select case p_type when 'dealership' then 'dealer'::buildtag.mod_source_type when 'dealer_group' then 'dealer'::buildtag.mod_source_type
    when 'manufacturer' then 'manufacturer'::buildtag.mod_source_type else 'shop'::buildtag.mod_source_type end;
$$;

-- Provenance is decided by the database from who is acting, never by the client.
create or replace function buildtag.modifications_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v buildtag.vehicles;
  org buildtag.organizations;
begin
  if uid is null then
    return new; -- operator seed / import through SQL
  end if;
  select * into v from buildtag.vehicles where id = new.vehicle_id;
  new.created_by_user_id := uid;

  if v.owner_id is null and new.created_by_organization_id is null then
    -- business staff adding to an unclaimed build: attribute to their business
    select r.organization_id into new.created_by_organization_id
      from buildtag.vehicle_relationships r
     where r.vehicle_id = v.id and r.ended_at is null and r.organization_id is not null
       and r.relationship_type in ('creator', 'builder', 'dealer') and buildtag.org_can_work(r.organization_id, 'staff')
     order by r.created_at limit 1;
  end if;

  if new.created_by_organization_id is not null then
    select * into org from buildtag.organizations where id = new.created_by_organization_id;
    if not found or not buildtag.org_can_work(org.id, 'staff') then
      raise exception 'You are not an active member of that business.' using errcode = '42501';
    end if;
    if v.owner_id is not null then
      raise exception 'This vehicle has been claimed. Its owner adds new parts now.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = org.id and r.ended_at is null) then
      raise exception 'Your business is not attached to this vehicle.' using errcode = '42501';
    end if;
    new.source_type := buildtag.org_source_type(org.organization_type);
    new.verification_status := case new.source_type
      when 'dealer' then 'dealer_recorded'::buildtag.mod_verification_status
      when 'manufacturer' then 'manufacturer_recorded'::buildtag.mod_verification_status
      else 'shop_recorded'::buildtag.mod_verification_status end;
    -- a business records its own work
    new.installed_by_organization_id := org.id;
  else
    if v.owner_id is distinct from uid then
      raise exception 'Only the owner can add parts to this vehicle.' using errcode = '42501';
    end if;
    new.source_type := 'owner';
    new.verification_status := 'owner_reported';
    new.work_order_reference := '';
  end if;
  new.is_hidden := coalesce(new.is_hidden, false);
  return new;
end;
$$;
create trigger modifications_before_insert before insert on buildtag.modifications for each row execute function buildtag.modifications_before_insert();

create or replace function buildtag.modifications_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  probe buildtag.modifications;
  vehicle_owner uuid;
begin
  if uid is null or buildtag.is_admin() then
    return new;
  end if;
  -- provenance never changes
  new.vehicle_id := old.vehicle_id;
  new.public_id := old.public_id;
  new.created_by_user_id := old.created_by_user_id;
  new.created_by_organization_id := old.created_by_organization_id;
  new.source_type := old.source_type;
  new.verification_status := old.verification_status;

  if old.created_by_organization_id is null then
    new.work_order_reference := old.work_order_reference;
    return new;
  end if;

  -- business records: that business may edit its own record (installer stays itself)
  if buildtag.is_org_member(old.created_by_organization_id, 'staff') then
    new.installed_by_organization_id := old.created_by_organization_id;
    return new;
  end if;

  -- anyone else: the owner may hide/show it; managers may reorder
  select owner_id into vehicle_owner from buildtag.vehicles where id = old.vehicle_id;
  probe := new;
  probe.sort_order := old.sort_order;
  probe.updated_at := old.updated_at;
  if vehicle_owner = uid then
    probe.is_hidden := old.is_hidden;
  end if;
  if probe is distinct from old then
    raise exception 'This part was recorded by a business, so its details stay as recorded. You can hide it from your public page.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger modifications_before_update before update on buildtag.modifications for each row execute function buildtag.modifications_before_update();

create or replace function buildtag.modifications_before_delete()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  vehicle_owner uuid;
  vehicle_exists boolean;
begin
  if (select auth.uid()) is null or buildtag.is_admin() or old.created_by_organization_id is null then
    return old;
  end if;
  select true, owner_id into vehicle_exists, vehicle_owner from buildtag.vehicles where id = old.vehicle_id;
  if vehicle_exists is null then
    return old; -- the vehicle itself is being deleted
  end if;
  if vehicle_owner is null and buildtag.is_org_member(old.created_by_organization_id, 'staff') then
    return old; -- the business correcting its own unclaimed build
  end if;
  raise exception 'Parts recorded by a business stay on the build history. Hide it instead.' using errcode = '42501';
end;
$$;
create trigger modifications_before_delete before delete on buildtag.modifications for each row execute function buildtag.modifications_before_delete();

drop policy if exists modifications_select on buildtag.modifications;
drop policy if exists modifications_insert on buildtag.modifications;
drop policy if exists modifications_update on buildtag.modifications;
drop policy if exists modifications_delete on buildtag.modifications;
create policy modifications_select on buildtag.modifications for select to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_org_member(created_by_organization_id, 'staff') or buildtag.is_admin());
-- Owners and managing businesses add parts; any business attached to an
-- unclaimed vehicle (e.g. an installer) may add its OWN records. The insert
-- trigger enforces the attachment and the unclaimed state.
create policy modifications_insert on buildtag.modifications for insert to authenticated
  with check (buildtag.owns_vehicle(vehicle_id) or buildtag.org_can_work(created_by_organization_id, 'staff'));
create policy modifications_update on buildtag.modifications for update to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_org_member(created_by_organization_id, 'staff'))
  with check (buildtag.owns_vehicle(vehicle_id) or buildtag.is_org_member(created_by_organization_id, 'staff'));
create policy modifications_delete on buildtag.modifications for delete to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_org_member(created_by_organization_id, 'staff'));

-- -----------------------------------------------------------------------------
-- Claims
-- -----------------------------------------------------------------------------
create table buildtag.vehicle_claims (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  organization_id uuid references buildtag.organizations (id) on delete set null,
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint text not null default '' check (char_length(code_hint) <= 8),
  status buildtag.vehicle_claim_status not null default 'active',
  expires_at timestamptz,
  recipient_email text not null default '' check (char_length(recipient_email) <= 200),
  invite_sent_at timestamptz,
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index vehicle_claims_token_hash_unique on buildtag.vehicle_claims (token_hash);
create unique index vehicle_claims_code_hash_unique on buildtag.vehicle_claims (code_hash);
create unique index vehicle_claims_one_active on buildtag.vehicle_claims (vehicle_id) where status = 'active';
create index vehicle_claims_org_idx on buildtag.vehicle_claims (organization_id, created_at desc);

-- Audit log. Never stores tokens or codes.
create table buildtag.claim_events (
  id bigint generated always as identity primary key,
  claim_id uuid references buildtag.vehicle_claims (id) on delete set null,
  vehicle_id uuid references buildtag.vehicles (id) on delete set null,
  organization_id uuid references buildtag.organizations (id) on delete set null,
  event text not null check (event in ('generated', 'viewed', 'attempted', 'succeeded', 'failed', 'revoked', 'expired', 'invite_sent')),
  actor_user_id uuid references auth.users (id) on delete set null,
  detail text not null default '' check (char_length(detail) <= 200),
  created_at timestamptz not null default now()
);
create index claim_events_claim_idx on buildtag.claim_events (claim_id, created_at);
create index claim_events_actor_idx on buildtag.claim_events (actor_user_id, created_at desc) where event = 'failed';

alter table buildtag.vehicle_claims enable row level security;
alter table buildtag.claim_events enable row level security;
grant select on buildtag.vehicle_claims, buildtag.claim_events to authenticated;
-- hashes are useless to readers; still, only the issuing business and admins see claims
create policy vehicle_claims_select on buildtag.vehicle_claims for select to authenticated
  using (buildtag.is_org_member(organization_id, 'staff') or buildtag.is_admin());
create policy claim_events_select on buildtag.claim_events for select to authenticated
  using (buildtag.is_org_member(organization_id, 'manager') or buildtag.is_admin());

create or replace function buildtag.sha256_hex(p_text text)
returns text language sql immutable set search_path = ''
as $$
  select encode(extensions.digest(convert_to(coalesce(p_text, ''), 'UTF8'), 'sha256'), 'hex');
$$;

-- "BT-H7K9-XP4M", "bt h7k9 xp4m", "H7K9XP4M" all normalize to "H7K9XP4M".
create or replace function buildtag.normalize_claim_code(p_code text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when char_length(s) = 10 and left(s, 2) = 'BT' then substr(s, 3)
    else s end
  from (select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) as s) x;
$$;

create or replace function buildtag.log_claim_event(p_claim uuid, p_vehicle uuid, p_org uuid, p_event text, p_detail text default '')
returns void language sql security definer set search_path = ''
as $$
  insert into buildtag.claim_events (claim_id, vehicle_id, organization_id, event, actor_user_id, detail)
  values (p_claim, p_vehicle, p_org, p_event, (select auth.uid()), left(coalesce(p_detail, ''), 200));
$$;
revoke execute on function buildtag.log_claim_event(uuid, uuid, uuid, text, text) from public;

-- Business generates the delivery claim. Returns the raw token/code ONCE;
-- only hashes are stored. Replaces any earlier active claim for the vehicle.
create or replace function buildtag.generate_vehicle_claim(p_vehicle_id uuid, p_expires_in_days integer default 60, p_recipient_email text default '')
returns jsonb language plpgsql security definer volatile set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v buildtag.vehicles;
  org_id uuid;
  raw_token text;
  raw_code text;
  claim buildtag.vehicle_claims;
  days integer := least(greatest(coalesce(p_expires_in_days, 60), 1), 365);
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into v from buildtag.vehicles where id = p_vehicle_id for update;
  if not found then raise exception 'Vehicle not found.' using errcode = 'P0002'; end if;
  if v.owner_id is not null then raise exception 'This vehicle has already been claimed.' using errcode = 'P0001'; end if;

  select r.organization_id into org_id
    from buildtag.vehicle_relationships r
   where r.vehicle_id = v.id and r.ended_at is null and r.organization_id is not null
     and r.relationship_type in ('creator', 'builder', 'dealer') and buildtag.org_can_work(r.organization_id, 'staff')
   order by r.created_at limit 1;
  if org_id is null then raise exception 'forbidden' using errcode = '42501'; end if;

  -- 256-bit URL token, 40-bit manual code (manual codes are rate limited and
  -- require a signed-in account, so enumeration is impractical)
  raw_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  raw_code := buildtag.short_code(8);

  update buildtag.vehicle_claims set status = 'revoked', revoked_at = now(), revoked_by_user_id = uid
   where vehicle_id = v.id and status = 'active';

  insert into buildtag.vehicle_claims (vehicle_id, organization_id, token_hash, code_hash, code_hint, expires_at, recipient_email, created_by_user_id)
  values (v.id, org_id, buildtag.sha256_hex(raw_token), buildtag.sha256_hex(raw_code), right(raw_code, 4), now() + make_interval(days => days),
          left(lower(trim(coalesce(p_recipient_email, ''))), 200), uid)
  returning * into claim;

  perform set_config('buildtag.ownership_change', 'on', true);
  update buildtag.vehicles set ownership_status = 'claim_pending' where id = v.id;
  perform set_config('buildtag.ownership_change', 'off', true);

  perform buildtag.log_claim_event(claim.id, v.id, org_id, 'generated', '');
  return jsonb_build_object(
    'claim_id', claim.id,
    'token', raw_token,
    'code', 'BT-' || left(raw_code, 4) || '-' || right(raw_code, 4),
    'expires_at', claim.expires_at
  );
end;
$$;
revoke execute on function buildtag.generate_vehicle_claim(uuid, integer, text) from public;
grant execute on function buildtag.generate_vehicle_claim(uuid, integer, text) to authenticated;

create or replace function buildtag.revoke_vehicle_claim(p_claim_id uuid)
returns void language plpgsql security definer volatile set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c buildtag.vehicle_claims;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into c from buildtag.vehicle_claims where id = p_claim_id for update;
  if not found then raise exception 'Claim not found.' using errcode = 'P0002'; end if;
  if not (buildtag.is_org_member(c.organization_id, 'manager') or c.created_by_user_id = uid or buildtag.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if c.status <> 'active' then return; end if;
  update buildtag.vehicle_claims set status = 'revoked', revoked_at = now(), revoked_by_user_id = uid where id = c.id;
  perform set_config('buildtag.ownership_change', 'on', true);
  update buildtag.vehicles set ownership_status = 'unclaimed' where id = c.vehicle_id and owner_id is null and ownership_status = 'claim_pending';
  perform set_config('buildtag.ownership_change', 'off', true);
  perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'revoked', '');
end;
$$;
revoke execute on function buildtag.revoke_vehicle_claim(uuid) from public;
grant execute on function buildtag.revoke_vehicle_claim(uuid) to authenticated;

create or replace function buildtag.record_claim_invite(p_claim_id uuid)
returns void language plpgsql security definer volatile set search_path = ''
as $$
declare c buildtag.vehicle_claims;
begin
  select * into c from buildtag.vehicle_claims where id = p_claim_id;
  if not found or not buildtag.is_org_member(c.organization_id, 'staff') then raise exception 'forbidden' using errcode = '42501'; end if;
  update buildtag.vehicle_claims set invite_sent_at = now() where id = c.id;
  perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'invite_sent', '');
end;
$$;
revoke execute on function buildtag.record_claim_invite(uuid) from public;
grant execute on function buildtag.record_claim_invite(uuid) to authenticated;

-- What the claim page shows before sign-in. Token only (256-bit): no
-- enumeration surface. Reveals nothing about who (if anyone) claimed it.
create or replace function buildtag.claim_preview(p_token text)
returns jsonb language plpgsql security definer volatile set search_path = ''
as $$
declare
  c buildtag.vehicle_claims;
  v buildtag.vehicles;
  o buildtag.organizations;
  state text;
begin
  if p_token is null or char_length(p_token) < 32 or char_length(p_token) > 64 then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into c from buildtag.vehicle_claims where token_hash = buildtag.sha256_hex(p_token);
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  state := c.status::text;
  if c.status = 'active' and c.expires_at is not null and c.expires_at < now() then
    update buildtag.vehicle_claims set status = 'expired' where id = c.id;
    perform set_config('buildtag.ownership_change', 'on', true);
    update buildtag.vehicles set ownership_status = 'unclaimed' where id = c.vehicle_id and owner_id is null and ownership_status = 'claim_pending';
    perform set_config('buildtag.ownership_change', 'off', true);
    perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'expired', '');
    state := 'expired';
  end if;
  if state <> 'active' then return jsonb_build_object('status', state); end if;

  select * into v from buildtag.vehicles where id = c.vehicle_id;
  select * into o from buildtag.organizations where id = c.organization_id;
  perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'viewed', '');
  return jsonb_build_object(
    'status', 'active',
    'expires_at', c.expires_at,
    'vehicle', jsonb_build_object(
      'year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim, 'nickname', v.nickname,
      'hero_image_url', v.hero_image_url,
      'mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id),
      'photo_count', (select count(*) from buildtag.vehicle_photos p where p.vehicle_id = v.id)
    ),
    'organization', case when o.id is null then null else jsonb_build_object(
      'name', o.name, 'slug', o.slug, 'logo_url', o.logo_url, 'organization_type', o.organization_type, 'verified_status', o.verified_status
    ) end
  );
end;
$$;
revoke execute on function buildtag.claim_preview(text) from public;
grant execute on function buildtag.claim_preview(text) to anon, authenticated;

-- The claim. Atomic: the claim row and the vehicle row are locked, owner_id
-- moves under the ownership flag (the OWNER relationship is written by the
-- sync trigger and guarded by the one-owner unique index). Failures RETURN
-- (not raise) so the failed attempt is logged and counts toward the limit.
create or replace function buildtag.claim_vehicle(p_token text default null, p_code text default null)
returns jsonb language plpgsql security definer volatile set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c buildtag.vehicle_claims;
  v buildtag.vehicles;
  o buildtag.organizations;
  crew record;
  recent_failures integer;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  select count(*) into recent_failures from buildtag.claim_events e
   where e.actor_user_id = uid and e.event = 'failed' and e.created_at > now() - interval '1 hour';
  if recent_failures >= 10 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if nullif(p_token, '') is not null then
    select * into c from buildtag.vehicle_claims where token_hash = buildtag.sha256_hex(p_token) for update;
  elsif char_length(buildtag.normalize_claim_code(p_code)) = 8 then
    select * into c from buildtag.vehicle_claims where code_hash = buildtag.sha256_hex(buildtag.normalize_claim_code(p_code)) for update;
  end if;
  if c.id is null then
    perform buildtag.log_claim_event(null, null, null, 'failed', 'no match');
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'attempted', '');

  if c.status = 'active' and c.expires_at is not null and c.expires_at < now() then
    update buildtag.vehicle_claims set status = 'expired' where id = c.id;
    c.status := 'expired';
  end if;
  if c.status <> 'active' then
    perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'failed', c.status::text);
    return jsonb_build_object('ok', false, 'error', c.status::text);
  end if;

  -- staff of the issuing business cannot take a customer's vehicle
  if buildtag.is_org_member(c.organization_id, 'staff') then
    perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'failed', 'issuing business member');
    return jsonb_build_object('ok', false, 'error', 'issuer_member');
  end if;

  select * into v from buildtag.vehicles where id = c.vehicle_id for update;
  if v.owner_id is not null then
    update buildtag.vehicle_claims set status = 'revoked', revoked_at = now() where id = c.id;
    perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'failed', 'already owned');
    return jsonb_build_object('ok', false, 'error', 'claimed');
  end if;

  perform buildtag.ensure_profile();

  perform set_config('buildtag.ownership_change', 'on', true);
  perform set_config('buildtag.ownership_via', 'claim', true);
  update buildtag.vehicles set owner_id = uid, ownership_status = 'claimed' where id = v.id;
  perform set_config('buildtag.ownership_change', 'off', true);
  perform set_config('buildtag.ownership_via', '', true);

  update buildtag.vehicle_claims set status = 'claimed', claimed_by_user_id = uid, claimed_at = now() where id = c.id;
  perform buildtag.log_claim_event(c.id, c.vehicle_id, c.organization_id, 'succeeded', '');

  select * into o from buildtag.organizations where id = c.organization_id;
  select cr.name, cr.slug, cr.id into crew
    from buildtag.crew_builds cb join buildtag.crews cr on cr.id = cb.crew_id
   where cb.vehicle_id = v.id order by cb.created_at limit 1;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', v.id,
    'slug', v.slug,
    'vehicle', jsonb_build_object('year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim, 'nickname', v.nickname, 'hero_image_url', v.hero_image_url),
    'organization', case when o.id is null then null else jsonb_build_object('name', o.name, 'slug', o.slug, 'logo_url', o.logo_url, 'organization_type', o.organization_type) end,
    'counts', jsonb_build_object(
      'mods', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id),
      'business_mods', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and m.created_by_organization_id is not null),
      'photos', (select count(*) from buildtag.vehicle_photos p where p.vehicle_id = v.id),
      'designs', (select count(*) from buildtag.tag_designs d where d.vehicle_id = v.id)
    ),
    'crew', case when crew.id is null then null else jsonb_build_object(
      'id', crew.id, 'name', crew.name, 'slug', crew.slug,
      'is_member', exists (select 1 from buildtag.crew_members m where m.crew_id = crew.id and m.user_id = uid)
    ) end
  );
end;
$$;
revoke execute on function buildtag.claim_vehicle(text, text) from public;
grant execute on function buildtag.claim_vehicle(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Crews: optional organization, build association separate from membership
-- -----------------------------------------------------------------------------
alter table buildtag.crews
  add column organization_id uuid references buildtag.organizations (id) on delete cascade,
  add column kind buildtag.crew_kind not null default 'riding';
alter table buildtag.crews drop constraint crews_owner_id_key;
create unique index crews_one_personal_per_owner on buildtag.crews (owner_id) where organization_id is null;
create unique index crews_one_per_organization on buildtag.crews (organization_id) where organization_id is not null;

-- Users may still belong to only one PERSONAL crew, but can also join any
-- number of business communities. Enforced in the functions below.
drop index if exists buildtag.crew_members_one_crew_per_user;
create index crew_members_user_idx on buildtag.crew_members (user_id);

create table buildtag.crew_builds (
  crew_id uuid not null references buildtag.crews (id) on delete cascade,
  vehicle_id uuid not null references buildtag.vehicles (id) on delete cascade,
  organization_id uuid references buildtag.organizations (id) on delete set null,
  added_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (crew_id, vehicle_id)
);
create index crew_builds_vehicle_idx on buildtag.crew_builds (vehicle_id);
alter table buildtag.crew_builds enable row level security;
grant select on buildtag.crew_builds to authenticated;
create policy crew_builds_select on buildtag.crew_builds for select to authenticated using (true);

create or replace function buildtag.is_personal_crew_member(p_user uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from buildtag.crew_members m join buildtag.crews c on c.id = m.crew_id where m.user_id = p_user and c.organization_id is null);
$$;
revoke execute on function buildtag.is_personal_crew_member(uuid) from public;

create or replace function buildtag.create_crew(p_name text, p_tagline text default '')
returns buildtag.crews language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  base text;
  candidate text;
  n integer := 0;
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if buildtag.user_plan(uid) <> 'pro' then
    raise exception 'Crews are a Pro feature.' using errcode = 'P0001';
  end if;
  if buildtag.is_personal_crew_member(uid) then
    raise exception 'You are already in a crew. Leave it first.' using errcode = 'P0001';
  end if;
  base := buildtag.crew_slugify(p_name);
  if char_length(base) < 2 then base := 'crew-' || lower(buildtag.short_code(4)); end if;
  candidate := base;
  while exists (select 1 from buildtag.crews x where x.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  insert into buildtag.crews (owner_id, name, slug, tagline) values (uid, trim(p_name), candidate, coalesce(left(trim(p_tagline), 140), '')) returning * into c;
  insert into buildtag.crew_members (crew_id, user_id, role) values (c.id, uid, 'owner');
  return c;
end;
$$;

create or replace function buildtag.update_crew(p_name text, p_tagline text)
returns buildtag.crews language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  update buildtag.crews set name = trim(p_name), tagline = coalesce(left(trim(p_tagline), 140), ''), updated_at = now()
   where owner_id = uid and organization_id is null returning * into c;
  if c.id is null then raise exception 'You do not own a crew.' using errcode = 'P0001'; end if;
  return c;
end;
$$;

create or replace function buildtag.crew_add_member(p_username text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
  target uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into c from buildtag.crews where owner_id = uid and organization_id is null;
  if not found then raise exception 'Create a crew first.' using errcode = 'P0001'; end if;
  if buildtag.user_plan(uid) <> 'pro' then raise exception 'Crews are a Pro feature. Renew Pro to manage members.' using errcode = 'P0001'; end if;
  select id into target from buildtag.profiles where lower(username) = lower(trim(leading '@' from trim(p_username)));
  if target is null then raise exception 'No BuildTag user with that username.' using errcode = 'P0001'; end if;
  if target = uid then raise exception 'You are already the crew owner.' using errcode = 'P0001'; end if;
  if buildtag.is_personal_crew_member(target) then
    raise exception 'That user is already in a crew.' using errcode = 'P0001';
  end if;
  if (select count(*) from buildtag.crew_members m where m.crew_id = c.id) >= 25 then
    raise exception 'Crews are capped at 25 members.' using errcode = 'P0001';
  end if;
  insert into buildtag.crew_members (crew_id, user_id, role) values (c.id, target, 'member');
end;
$$;

create or replace function buildtag.crew_remove_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select c2.* into c from buildtag.crews c2 join buildtag.crew_members m on m.crew_id = c2.id
   where m.user_id = p_user_id and c2.organization_id is null;
  if not found then return; end if;
  if c.owner_id = p_user_id then raise exception 'The owner cannot leave. Delete the crew instead.' using errcode = 'P0001'; end if;
  if uid <> c.owner_id and uid <> p_user_id then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from buildtag.crew_members where crew_id = c.id and user_id = p_user_id;
end;
$$;

create or replace function buildtag.delete_crew()
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from buildtag.crews where owner_id = uid and organization_id is null;
end;
$$;

-- Business community crew (one per organization).
create or replace function buildtag.org_create_crew(p_org uuid, p_name text, p_tagline text default '', p_kind buildtag.crew_kind default 'shop')
returns buildtag.crews language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  base text;
  candidate text;
  n integer := 0;
  c buildtag.crews;
begin
  if not buildtag.org_can_work(p_org, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from buildtag.crews x where x.organization_id = p_org) then
    raise exception 'This business already has a crew.' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Give the crew a name.' using errcode = 'P0001'; end if;
  base := buildtag.crew_slugify(p_name);
  if char_length(base) < 2 then base := 'crew-' || lower(buildtag.short_code(4)); end if;
  candidate := base;
  while exists (select 1 from buildtag.crews x where x.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  insert into buildtag.crews (owner_id, name, slug, tagline, organization_id, kind)
  values (uid, left(trim(p_name), 40), candidate, coalesce(left(trim(p_tagline), 140), ''), p_org, coalesce(p_kind, 'shop'))
  returning * into c;
  return c;
end;
$$;
revoke execute on function buildtag.org_create_crew(uuid, text, text, buildtag.crew_kind) from public;
grant execute on function buildtag.org_create_crew(uuid, text, text, buildtag.crew_kind) to authenticated;

create or replace function buildtag.org_update_crew(p_org uuid, p_name text, p_tagline text, p_kind buildtag.crew_kind default null)
returns buildtag.crews language plpgsql security definer set search_path = ''
as $$
declare c buildtag.crews;
begin
  if not buildtag.is_org_member(p_org, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  update buildtag.crews set name = left(trim(p_name), 40), tagline = coalesce(left(trim(p_tagline), 140), ''), kind = coalesce(p_kind, kind), updated_at = now()
   where organization_id = p_org returning * into c;
  if c.id is null then raise exception 'Create the crew first.' using errcode = 'P0001'; end if;
  return c;
end;
$$;
revoke execute on function buildtag.org_update_crew(uuid, text, text, buildtag.crew_kind) from public;
grant execute on function buildtag.org_update_crew(uuid, text, text, buildtag.crew_kind) to authenticated;

-- A rider chooses to join (or leave) a business community. Never automatic.
create or replace function buildtag.join_crew(p_crew_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into c from buildtag.crews where id = p_crew_id;
  if not found or c.organization_id is null then
    raise exception 'Only business crews can be joined directly.' using errcode = 'P0001';
  end if;
  perform buildtag.ensure_profile();
  insert into buildtag.crew_members (crew_id, user_id, role) values (c.id, uid, 'member') on conflict do nothing;
end;
$$;
revoke execute on function buildtag.join_crew(uuid) from public;
grant execute on function buildtag.join_crew(uuid) to authenticated;

create or replace function buildtag.leave_crew(p_crew_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into c from buildtag.crews where id = p_crew_id;
  if not found then return; end if;
  if c.organization_id is null and c.owner_id = uid then
    raise exception 'The owner cannot leave. Delete the crew instead.' using errcode = 'P0001';
  end if;
  delete from buildtag.crew_members where crew_id = c.id and user_id = uid;
end;
$$;
revoke execute on function buildtag.leave_crew(uuid) from public;
grant execute on function buildtag.leave_crew(uuid) to authenticated;

-- Business attributes a build it worked on to its crew (build association).
create or replace function buildtag.org_associate_build(p_org uuid, p_vehicle_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare c buildtag.crews;
begin
  if not buildtag.org_can_work(p_org, 'staff') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = p_vehicle_id and r.organization_id = p_org and r.ended_at is null)
     and not exists (select 1 from buildtag.modifications m where m.vehicle_id = p_vehicle_id and m.created_by_organization_id = p_org) then
    raise exception 'Your business is not attached to this vehicle.' using errcode = '42501';
  end if;
  select * into c from buildtag.crews where organization_id = p_org;
  if not found then raise exception 'Create your crew first.' using errcode = 'P0001'; end if;
  insert into buildtag.crew_builds (crew_id, vehicle_id, organization_id, added_by_user_id)
  values (c.id, p_vehicle_id, p_org, auth.uid()) on conflict do nothing;
end;
$$;
revoke execute on function buildtag.org_associate_build(uuid, uuid) from public;
grant execute on function buildtag.org_associate_build(uuid, uuid) to authenticated;

-- The vehicle's owner (or the business) can remove the association.
create or replace function buildtag.remove_crew_build(p_crew_id uuid, p_vehicle_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare c buildtag.crews;
begin
  select * into c from buildtag.crews where id = p_crew_id;
  if not found then return; end if;
  if not (exists (select 1 from buildtag.vehicles v where v.id = p_vehicle_id and v.owner_id = auth.uid())
          or buildtag.is_org_member(c.organization_id, 'staff') or buildtag.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from buildtag.crew_builds where crew_id = p_crew_id and vehicle_id = p_vehicle_id;
end;
$$;
revoke execute on function buildtag.remove_crew_build(uuid, uuid) from public;
grant execute on function buildtag.remove_crew_build(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Public read model
-- -----------------------------------------------------------------------------
-- Unclaimed builds are public too; owner_username is null for them.
create or replace view buildtag.public_builds
with (security_invoker = false)
as
  select v.slug, v.year, v.make, v.model, v.trim, v.nickname, v.hero_image_url, v.horsepower, v.horsepower_type,
         v.torque, v.torque_unit, v.mod_count, v.like_count, v.scan_count, v.created_at, v.updated_at,
         p.username as owner_username
  from buildtag.vehicles v
  left join buildtag.profiles p on p.id = v.owner_id
  where v.visibility = 'public' and v.status = 'active';
grant select on buildtag.public_builds to anon, authenticated;

create or replace function buildtag.public_org_json(p_org uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when o.id is null then null else jsonb_build_object(
    'name', o.name, 'slug', o.slug, 'logo_url', o.logo_url, 'organization_type', o.organization_type,
    'verified', o.verified_status = 'verified', 'location_text', o.location_text, 'website_url', o.website_url,
    'tagline', o.tagline, 'instagram_handle', o.instagram_handle
  ) end
  from (select 1) x left join buildtag.organizations o on o.id = p_org and o.status = 'active';
$$;
revoke execute on function buildtag.public_org_json(uuid) from public;

create or replace function buildtag.get_public_build(p_slug text, p_visitor_key text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v buildtag.vehicles;
  p buildtag.profiles;
  caller uuid := auth.uid();
  is_owner boolean := false;
  can_manage boolean := false;
  is_admin boolean := false;
  liked boolean := false;
begin
  select * into v from buildtag.vehicles where slug = lower(p_slug);
  if not found then
    return jsonb_build_object('access', 'not_found');
  end if;
  is_owner := caller is not null and caller = v.owner_id;
  if caller is not null then
    is_admin := exists (select 1 from buildtag.admins a where a.user_id = caller);
    can_manage := is_owner or buildtag.org_manages_vehicle(v.id, 'staff');
  end if;
  if v.status = 'disabled' and not (can_manage or is_admin) then
    return jsonb_build_object('access', 'disabled');
  end if;
  if v.visibility = 'private' and not (can_manage or is_admin) then
    return jsonb_build_object('access', 'private');
  end if;
  if v.owner_id is not null then
    select * into p from buildtag.profiles where id = v.owner_id;
  end if;
  if p_visitor_key is not null then
    liked := exists (select 1 from buildtag.build_likes l where l.vehicle_id = v.id and l.visitor_key = p_visitor_key);
  end if;
  return jsonb_build_object(
    'access', 'ok',
    'is_owner', is_owner,
    'can_manage', can_manage,
    'liked', liked,
    'build', jsonb_build_object(
      'slug', v.slug, 'year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim, 'nickname', v.nickname,
      'description', v.description, 'hero_image_url', v.hero_image_url, 'profile_image_url', v.profile_image_url,
      'location_text', v.location_text, 'horsepower', v.horsepower, 'horsepower_type', v.horsepower_type,
      'torque', v.torque, 'torque_unit', v.torque_unit, 'mileage', v.mileage, 'mileage_unit', v.mileage_unit,
      'build_started_year', v.build_started_year,
      'build_cost', case when v.build_cost_public then v.build_cost else null end,
      'build_cost_public', v.build_cost_public, 'dyno_type', v.dyno_type, 'visibility', v.visibility, 'status', v.status,
      'show_owner_section', v.show_owner_section,
      'mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and not m.is_hidden),
      'like_count', v.like_count, 'scan_count', v.scan_count,
      'created_at', v.created_at, 'updated_at', v.updated_at,
      'is_claimed', v.owner_id is not null,
      'qr_code', (select q.code from buildtag.qr_codes q where q.vehicle_id = v.id and q.status = 'active' order by q.created_at limit 1),
      'has_affiliate_links', exists (select 1 from buildtag.modifications m where m.vehicle_id = v.id and not m.is_hidden and nullif(m.affiliate_url, '') is not null),
      'photos', coalesce((
        select jsonb_agg(jsonb_build_object('storage_path', ph.storage_path, 'caption', ph.caption, 'alt_text', ph.alt_text, 'width', ph.width, 'height', ph.height) order by ph.sort_order, ph.created_at)
        from buildtag.vehicle_photos ph where ph.vehicle_id = v.id
      ), '[]'::jsonb),
      'modifications', coalesce((
        select jsonb_agg(jsonb_build_object(
          'public_id', m.public_id, 'category', m.category, 'brand', m.brand, 'part_name', m.part_name, 'part_number', m.part_number,
          'description', m.description, 'price', case when m.price_public then m.price else null end,
          'has_link', (nullif(m.affiliate_url, '') is not null or nullif(m.product_url, '') is not null),
          'is_affiliate', (nullif(m.affiliate_url, '') is not null),
          'merchant', m.merchant, 'installed_by_text', m.installed_by_text, 'installation_date', m.installation_date,
          'source_type', m.source_type, 'verification_status', m.verification_status,
          'shop', buildtag.public_org_json(m.installed_by_organization_id),
          'recorded_by', buildtag.public_org_json(m.created_by_organization_id),
          'part', case when pt.id is null then null else jsonb_build_object('brand', pt.brand, 'name', pt.name, 'slug', pt.slug, 'image_url', pt.image_url) end
        ) order by m.category, m.sort_order, m.created_at)
        from buildtag.modifications m
        left join buildtag.parts pt on pt.id = m.part_id
        where m.vehicle_id = v.id and not m.is_hidden
      ), '[]'::jsonb),
      -- businesses that built/sold/serviced it, with the parts actually attributed to them
      'contributors', coalesce((
        select jsonb_agg(x.j order by x.first_at)
        from (
          select jsonb_build_object(
                   'organization', buildtag.public_org_json(o.id),
                   'roles', coalesce((select jsonb_agg(distinct r.relationship_type) from buildtag.vehicle_relationships r
                                       where r.vehicle_id = v.id and r.organization_id = o.id and r.ended_at is null), '[]'::jsonb),
                   'mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and not m.is_hidden
                                  and m.created_by_organization_id = o.id),
                   'crew', (select jsonb_build_object('name', c.name, 'slug', c.slug) from buildtag.crews c where c.organization_id = o.id)
                 ) as j,
                 least(
                   coalesce((select min(r.started_at) from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = o.id), now()),
                   coalesce((select min(m.created_at) from buildtag.modifications m where m.vehicle_id = v.id and m.created_by_organization_id = o.id), now())
                 ) as first_at
          from buildtag.organizations o
          where o.status = 'active' and (
            exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = o.id and r.ended_at is null)
            or exists (select 1 from buildtag.modifications m where m.vehicle_id = v.id and not m.is_hidden and m.created_by_organization_id = o.id)
          )
        ) x
      ), '[]'::jsonb),
      'crews', coalesce((
        select jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug, 'kind', c.kind) order by cb.created_at)
        from buildtag.crew_builds cb join buildtag.crews c on c.id = cb.crew_id where cb.vehicle_id = v.id
      ), '[]'::jsonb),
      'vehicle_socials', coalesce((
        select jsonb_agg(jsonb_build_object('public_id', sl.public_id, 'platform', sl.platform, 'handle', sl.handle, 'url', sl.url) order by sl.sort_order, sl.created_at)
        from buildtag.social_links sl where sl.owner_type = 'vehicle' and sl.owner_id = v.id and sl.is_public
      ), '[]'::jsonb),
      'owner', case
        when p.id is null then null
        when v.show_owner_section then jsonb_build_object(
          'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'bio', p.bio,
          'location_text', p.location_text, 'website_url', p.website_url,
          'socials', coalesce((
            select jsonb_agg(jsonb_build_object('public_id', sl.public_id, 'platform', sl.platform, 'handle', sl.handle, 'url', sl.url) order by sl.sort_order, sl.created_at)
            from buildtag.social_links sl where sl.owner_type = 'profile' and sl.owner_id = p.id and sl.is_public
          ), '[]'::jsonb))
        else jsonb_build_object('username', p.username) end
    )
  );
end;
$$;

-- Hidden parts are not clickable from the public page either.
create or replace function buildtag.record_product_click(p_slug text, p_public_id text)
returns text language plpgsql security definer volatile set search_path = ''
as $$
declare
  v buildtag.vehicles;
  m buildtag.modifications;
  target text;
begin
  select * into v from buildtag.vehicles where slug = lower(p_slug) and status = 'active' and visibility in ('public', 'unlisted');
  if not found then return null; end if;
  select * into m from buildtag.modifications where vehicle_id = v.id and public_id = p_public_id and not is_hidden;
  if not found then return null; end if;
  target := coalesce(nullif(m.affiliate_url, ''), nullif(m.product_url, ''));
  if target is null then return null; end if;
  insert into buildtag.product_clicks (vehicle_id, modification_id) values (v.id, m.id);
  return target;
end;
$$;

-- Organization social links count toward clicks when shown on a build page.
create or replace function buildtag.record_social_click(p_slug text, p_public_id text)
returns text language plpgsql security definer volatile set search_path = ''
as $$
declare
  v buildtag.vehicles;
  sl buildtag.social_links;
begin
  select * into v from buildtag.vehicles where slug = lower(p_slug) and status = 'active' and visibility in ('public', 'unlisted');
  if not found then return null; end if;
  select * into sl from buildtag.social_links
   where public_id = p_public_id and is_public
     and ((owner_type = 'vehicle' and owner_id = v.id)
       or (owner_type = 'profile' and v.owner_id is not null and owner_id = v.owner_id and v.show_owner_section));
  if not found then return null; end if;
  insert into buildtag.social_clicks (vehicle_id, social_link_id) values (v.id, sl.id);
  return sl.url;
end;
$$;

-- Analytics: whoever may manage the vehicle (owner, or the business while unclaimed).
create or replace function buildtag.vehicle_analytics(p_vehicle_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v buildtag.vehicles;
begin
  select * into v from buildtag.vehicles where id = p_vehicle_id;
  if not found then
    return null;
  end if;
  if not (buildtag.owns_vehicle(v.id) or buildtag.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_scans', v.scan_count,
    'scans_today', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= date_trunc('day', now())),
    'scans_7d', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= now() - interval '7 days'),
    'scans_30d', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= now() - interval '30 days'),
    'likes', v.like_count,
    'product_clicks', v.click_count,
    'social_clicks', (select count(*) from buildtag.social_clicks c where c.vehicle_id = v.id),
    'affiliate_clicks', (select count(*) from buildtag.product_clicks pc join buildtag.modifications m on m.id = pc.modification_id where pc.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null),
    'affiliate_clicks_30d', (select count(*) from buildtag.product_clicks pc join buildtag.modifications m on m.id = pc.modification_id where pc.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null and pc.occurred_at >= now() - interval '30 days'),
    'total_parts', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id),
    'linked_parts', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and (nullif(m.affiliate_url, '') is not null or nullif(m.product_url, '') is not null)),
    'monetized_parts', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null),
    'scans_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(s.count, 0)) order by d.day)
      from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as d(day)
      left join (
        select occurred_at::date as day, count(*) as count from buildtag.scan_events e
        where e.vehicle_id = v.id and e.occurred_at >= (now() - interval '29 days')::date group by 1
      ) s on s.day = d.day
    ), '[]'::jsonb),
    'top_parts', coalesce((
      select jsonb_agg(jsonb_build_object('part_name', m.part_name, 'brand', m.brand, 'count', c.count, 'is_affiliate', (nullif(m.affiliate_url, '') is not null)) order by c.count desc)
      from (
        select modification_id, count(*) as count from buildtag.product_clicks pc
        where pc.vehicle_id = v.id and pc.modification_id is not null group by modification_id order by count desc limit 8
      ) c join buildtag.modifications m on m.id = c.modification_id
    ), '[]'::jsonb),
    'top_socials', coalesce((
      select jsonb_agg(jsonb_build_object('platform', sl.platform, 'handle', sl.handle, 'owner_type', sl.owner_type, 'count', c.count) order by c.count desc)
      from (
        select social_link_id, count(*) as count from buildtag.social_clicks sc
        where sc.vehicle_id = v.id and sc.social_link_id is not null group by social_link_id order by count desc limit 8
      ) c join buildtag.social_links sl on sl.id = c.social_link_id
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_object_agg(device_type, count) from (
        select device_type, count(*) as count from buildtag.scan_events e where e.vehicle_id = v.id group by device_type
      ) d
    ), '{}'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('country', country, 'count', count) order by count desc) from (
        select coalesce(country, '??') as country, count(*) as count from buildtag.scan_events e where e.vehicle_id = v.id group by 1 order by 2 desc limit 8
      ) c
    ), '[]'::jsonb)
  );
end;
$$;

-- Crew page: members' builds plus builds a business associated (deduplicated).
create or replace function buildtag.get_crew(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare c buildtag.crews;
begin
  select * into c from buildtag.crews where slug = lower(p_slug);
  if not found then return null; end if;
  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'slug', c.slug, 'tagline', c.tagline, 'created_at', c.created_at, 'kind', c.kind,
    'organization', buildtag.public_org_json(c.organization_id),
    'owner_username', case when c.organization_id is null then (select p.username from buildtag.profiles p where p.id = c.owner_id) else null end,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'role', m.role, 'joined_at', m.joined_at) order by (m.role = 'owner') desc, m.joined_at)
      from buildtag.crew_members m join buildtag.profiles p on p.id = m.user_id where m.crew_id = c.id
    ), '[]'::jsonb),
    'builds', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.scan_count desc, b.created_at) from buildtag.public_builds b
      where b.slug in (
        select v.slug from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id where m.crew_id = c.id
        union
        select v.slug from buildtag.vehicles v join buildtag.crew_builds cb on cb.vehicle_id = v.id where cb.crew_id = c.id
      )
    ), '[]'::jsonb),
    'total_scans', coalesce((
      select sum(b.scan_count) from buildtag.public_builds b
      where b.slug in (
        select v.slug from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id where m.crew_id = c.id
        union
        select v.slug from buildtag.vehicles v join buildtag.crew_builds cb on cb.vehicle_id = v.id where cb.crew_id = c.id
      )
    ), 0)
  );
end;
$$;

-- Personal crew badge (unchanged semantics: the owner's personal crew).
create or replace function buildtag.build_crew(p_slug text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('name', c.name, 'slug', c.slug)
  from buildtag.vehicles v
  join buildtag.crew_members m on m.user_id = v.owner_id
  join buildtag.crews c on c.id = m.crew_id and c.organization_id is null
  where v.slug = lower(p_slug)
  limit 1;
$$;

create or replace function buildtag.my_crew()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select buildtag.get_crew(c.slug) from buildtag.crews c join buildtag.crew_members m on m.crew_id = c.id
   where m.user_id = auth.uid() and c.organization_id is null limit 1;
$$;

-- Business communities the caller belongs to.
create or replace function buildtag.my_business_crews()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'kind', c.kind, 'organization', buildtag.public_org_json(c.organization_id)) order by m.joined_at), '[]'::jsonb)
  from buildtag.crews c join buildtag.crew_members m on m.crew_id = c.id
  where m.user_id = auth.uid() and c.organization_id is not null;
$$;
revoke execute on function buildtag.my_business_crews() from public;
grant execute on function buildtag.my_business_crews() to authenticated;

create or replace function buildtag.crew_leaderboard(p_period text default 'all', p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  since timestamptz;
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  since := case p_period
    when 'day' then date_trunc('day', now())
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else null
  end;
  return coalesce((
    with crew_vehicles as (
      select m.crew_id, v.id as vehicle_id from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id
       where v.visibility = 'public' and v.status = 'active'
      union
      select cb.crew_id, v.id from buildtag.vehicles v join buildtag.crew_builds cb on cb.vehicle_id = v.id
       where v.visibility = 'public' and v.status = 'active'
    ), scored as (
      select c2.id,
        case when since is null then
          coalesce((select sum(v.scan_count) from crew_vehicles cv join buildtag.vehicles v on v.id = cv.vehicle_id where cv.crew_id = c2.id), 0)
        else
          coalesce((select count(*) from buildtag.scan_events e join crew_vehicles cv on cv.vehicle_id = e.vehicle_id where cv.crew_id = c2.id and e.occurred_at >= since), 0)
        end as scans
      from buildtag.crews c2
      order by scans desc, c2.created_at asc
      limit lim
    )
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'slug', c.slug, 'tagline', c.tagline, 'created_at', c.created_at, 'kind', c.kind,
      'organization', buildtag.public_org_json(c.organization_id),
      'member_count', (select count(*) from buildtag.crew_members m where m.crew_id = c.id),
      'build_count', (select count(*) from crew_vehicles cv where cv.crew_id = c.id),
      'hero_image_url', (select v.hero_image_url from crew_vehicles cv join buildtag.vehicles v on v.id = cv.vehicle_id where cv.crew_id = c.id and v.hero_image_url is not null order by v.scan_count desc limit 1),
      'scans', s.scans
    ) order by s.scans desc, c.created_at asc)
    from scored s join buildtag.crews c on c.id = s.id
  ), '[]'::jsonb);
end;
$$;

-- Public organization page. Never exposes claim status or customer details.
create or replace function buildtag.get_public_organization(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare o buildtag.organizations;
begin
  select * into o from buildtag.organizations where slug = lower(p_slug) and status = 'active';
  if not found then return null; end if;
  return jsonb_build_object(
    'id', o.id, 'name', o.name, 'slug', o.slug, 'organization_type', o.organization_type, 'tagline', o.tagline,
    'description', o.description, 'logo_url', o.logo_url, 'website_url', o.website_url,
    'phone', o.phone, 'email', o.email, 'location_text', o.location_text, 'city', o.city, 'region', o.region, 'country', o.country,
    'instagram_handle', o.instagram_handle, 'verified', o.verified_status = 'verified', 'created_at', o.created_at,
    'socials', coalesce((
      select jsonb_agg(jsonb_build_object('platform', sl.platform, 'handle', sl.handle, 'url', sl.url) order by sl.sort_order, sl.created_at)
      from buildtag.social_links sl where sl.owner_type = 'shop' and sl.owner_id = o.id and sl.is_public
    ), '[]'::jsonb),
    'crew', (select jsonb_build_object('name', c.name, 'slug', c.slug, 'kind', c.kind, 'tagline', c.tagline,
                                       'member_count', (select count(*) from buildtag.crew_members m where m.crew_id = c.id))
               from buildtag.crews c where c.organization_id = o.id),
    'documented_mods', (select count(*) from buildtag.modifications m join buildtag.vehicles v on v.id = m.vehicle_id
                         where m.created_by_organization_id = o.id and not m.is_hidden and v.visibility = 'public' and v.status = 'active'),
    'builds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', v.slug, 'year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim, 'nickname', v.nickname,
        'hero_image_url', v.hero_image_url, 'horsepower', v.horsepower, 'horsepower_type', v.horsepower_type,
        'scan_count', v.scan_count, 'like_count', v.like_count,
        'mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and not m.is_hidden),
        'shop_mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and not m.is_hidden and m.created_by_organization_id = o.id),
        'roles', (select coalesce(jsonb_agg(distinct r.relationship_type), '[]'::jsonb) from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = o.id and r.ended_at is null)
      ) order by v.scan_count desc, v.created_at desc)
      from buildtag.vehicles v
      where v.visibility = 'public' and v.status = 'active' and (
        exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = o.id and r.ended_at is null)
        or exists (select 1 from buildtag.modifications m where m.vehicle_id = v.id and m.created_by_organization_id = o.id and not m.is_hidden)
      )
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function buildtag.get_public_organization(text) from public;
grant execute on function buildtag.get_public_organization(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Business workflow
-- -----------------------------------------------------------------------------
-- Anyone signed in can register a business; it stays `pending` (profile only)
-- until a BuildTags admin activates it (Business plan: contact us).
create or replace function buildtag.create_organization(p_name text, p_type buildtag.organization_type, p_details jsonb default '{}'::jsonb)
returns buildtag.organizations language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  base text;
  candidate text;
  n integer := 0;
  o buildtag.organizations;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter the business name.' using errcode = 'P0001'; end if;
  if (select count(*) from buildtag.organizations x where x.created_by_user_id = uid) >= 3 and not buildtag.is_admin() then
    raise exception 'You have registered the maximum number of businesses. Contact us to add more.' using errcode = 'P0001';
  end if;
  base := left(buildtag.slugify(p_name), 60);
  if char_length(base) < 2 then base := 'shop-' || lower(buildtag.short_code(5)); end if;
  candidate := base;
  while exists (select 1 from buildtag.organizations x where x.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  perform buildtag.ensure_profile();
  insert into buildtag.organizations (created_by_user_id, name, slug, organization_type, description, website_url, location_text, city, region, country, phone, email)
  values (uid, left(trim(p_name), 80), candidate, coalesce(p_type, 'other'),
          left(coalesce(p_details ->> 'description', ''), 1000),
          nullif(left(coalesce(p_details ->> 'website_url', ''), 300), ''),
          left(coalesce(p_details ->> 'location_text', ''), 80),
          left(coalesce(p_details ->> 'city', ''), 80), left(coalesce(p_details ->> 'region', ''), 80),
          coalesce(nullif(upper(left(p_details ->> 'country', 2)), ''), 'US'),
          left(coalesce(p_details ->> 'phone', ''), 40), left(coalesce(p_details ->> 'email', ''), 200))
  returning * into o;
  insert into buildtag.organization_members (organization_id, user_id, role, added_by_user_id) values (o.id, uid, 'owner', uid);
  return o;
end;
$$;
revoke execute on function buildtag.create_organization(text, buildtag.organization_type, jsonb) from public;
grant execute on function buildtag.create_organization(text, buildtag.organization_type, jsonb) to authenticated;

create or replace function buildtag.my_organizations()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'name', o.name, 'slug', o.slug, 'organization_type', o.organization_type, 'status', o.status,
    'verified_status', o.verified_status, 'logo_url', o.logo_url, 'role', m.role
  ) order by o.name), '[]'::jsonb)
  from buildtag.organization_members m join buildtag.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and m.status = 'active';
$$;
revoke execute on function buildtag.my_organizations() from public;
grant execute on function buildtag.my_organizations() to authenticated;

create or replace function buildtag.org_team(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (buildtag.is_org_member(p_org, 'staff') or buildtag.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
                                        'role', m.role, 'status', m.status, 'created_at', m.created_at)
                     order by buildtag.org_role_rank(m.role) desc, m.created_at)
    from buildtag.organization_members m join buildtag.profiles p on p.id = m.user_id
    where m.organization_id = p_org and m.status = 'active'
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.org_team(uuid) from public;
grant execute on function buildtag.org_team(uuid) to authenticated;

-- Team management. Admins manage manager/staff; only owners grant admin/owner.
create or replace function buildtag.org_add_member(p_org uuid, p_username text, p_role buildtag.org_member_role default 'staff')
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if not buildtag.is_org_member(p_org, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role in ('owner', 'admin') and not buildtag.is_org_member(p_org, 'owner') then
    raise exception 'Only an owner can add admins or owners.' using errcode = '42501';
  end if;
  select id into target from buildtag.profiles where lower(username) = lower(trim(leading '@' from trim(p_username)));
  if target is null then raise exception 'No BuildTags user with that username. Ask them to sign up first.' using errcode = 'P0001'; end if;
  if (select count(*) from buildtag.organization_members m where m.organization_id = p_org and m.status = 'active') >= 100 then
    raise exception 'Contact us to add more than 100 team members.' using errcode = 'P0001';
  end if;
  insert into buildtag.organization_members (organization_id, user_id, role, status, added_by_user_id)
  values (p_org, target, p_role, 'active', uid)
  on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active', added_by_user_id = uid;
end;
$$;
revoke execute on function buildtag.org_add_member(uuid, text, buildtag.org_member_role) from public;
grant execute on function buildtag.org_add_member(uuid, text, buildtag.org_member_role) to authenticated;

create or replace function buildtag.org_set_member_role(p_org uuid, p_user_id uuid, p_role buildtag.org_member_role)
returns void language plpgsql security definer set search_path = ''
as $$
declare cur_role buildtag.org_member_role;
begin
  if not buildtag.is_org_member(p_org, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  select role into cur_role from buildtag.organization_members where organization_id = p_org and user_id = p_user_id and status = 'active';
  if cur_role is null then raise exception 'Not a team member.' using errcode = 'P0001'; end if;
  if (cur_role in ('owner', 'admin') or p_role in ('owner', 'admin')) and not buildtag.is_org_member(p_org, 'owner') then
    raise exception 'Only an owner can change admins or owners.' using errcode = '42501';
  end if;
  if cur_role = 'owner' and p_role <> 'owner'
     and (select count(*) from buildtag.organization_members m where m.organization_id = p_org and m.role = 'owner' and m.status = 'active') <= 1 then
    raise exception 'A business needs at least one owner.' using errcode = 'P0001';
  end if;
  update buildtag.organization_members set role = p_role where organization_id = p_org and user_id = p_user_id;
end;
$$;
revoke execute on function buildtag.org_set_member_role(uuid, uuid, buildtag.org_member_role) from public;
grant execute on function buildtag.org_set_member_role(uuid, uuid, buildtag.org_member_role) to authenticated;

create or replace function buildtag.org_remove_member(p_org uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare cur_role buildtag.org_member_role;
begin
  select role into cur_role from buildtag.organization_members where organization_id = p_org and user_id = p_user_id and status = 'active';
  if cur_role is null then return; end if;
  if p_user_id <> auth.uid() then
    if not buildtag.is_org_member(p_org, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
    if cur_role in ('owner', 'admin') and not buildtag.is_org_member(p_org, 'owner') then
      raise exception 'Only an owner can remove admins or owners.' using errcode = '42501';
    end if;
  end if;
  if cur_role = 'owner'
     and (select count(*) from buildtag.organization_members m where m.organization_id = p_org and m.role = 'owner' and m.status = 'active') <= 1 then
    raise exception 'A business needs at least one owner.' using errcode = 'P0001';
  end if;
  update buildtag.organization_members set status = 'removed' where organization_id = p_org and user_id = p_user_id;
end;
$$;
revoke execute on function buildtag.org_remove_member(uuid, uuid) from public;
grant execute on function buildtag.org_remove_member(uuid, uuid) to authenticated;

-- Create a customer vehicle for an active business. owner_id stays null; the
-- business is CREATOR plus whichever roles it selects. Optional private
-- customer record and crew association in the same transaction.
create or replace function buildtag.org_create_vehicle(p_org uuid, p_vehicle jsonb, p_roles buildtag.vehicle_relationship_type[] default array['builder']::buildtag.vehicle_relationship_type[], p_customer jsonb default null, p_add_to_crew boolean default true)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  vid uuid;
  role_type buildtag.vehicle_relationship_type;
  crew_id uuid;
begin
  if not buildtag.org_can_work(p_org, 'staff') then
    raise exception 'Your business account is not active yet. Contact us to activate BuildTags Business.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_vehicle ->> 'make', ''))) < 1 or char_length(trim(coalesce(p_vehicle ->> 'model', ''))) < 1 then
    raise exception 'Make and model are required.' using errcode = 'P0001';
  end if;

  perform set_config('buildtag.org_create', 'on', true);
  insert into buildtag.vehicles (owner_id, ownership_status, year, make, model, trim, nickname, description, location_text, visibility, show_owner_section)
  values (
    null, 'unclaimed',
    nullif(p_vehicle ->> 'year', '')::integer,
    left(trim(p_vehicle ->> 'make'), 60), left(trim(p_vehicle ->> 'model'), 60),
    left(coalesce(p_vehicle ->> 'trim', ''), 60), left(coalesce(p_vehicle ->> 'nickname', ''), 40),
    left(coalesce(p_vehicle ->> 'description', ''), 3000), left(coalesce(p_vehicle ->> 'location_text', ''), 80),
    coalesce(nullif(p_vehicle ->> 'visibility', ''), 'public')::buildtag.vehicle_visibility, true
  ) returning id into vid;
  perform set_config('buildtag.org_create', 'off', true);

  insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, organization_id, created_by_user_id, metadata)
  values (vid, 'creator', p_org, uid, '{"via":"org_create_vehicle"}'::jsonb);
  foreach role_type in array coalesce(p_roles, array[]::buildtag.vehicle_relationship_type[]) loop
    if role_type not in ('owner', 'creator') then
      insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, organization_id, created_by_user_id, metadata)
      values (vid, role_type, p_org, uid, '{"via":"org_create_vehicle"}'::jsonb)
      on conflict do nothing;
    end if;
  end loop;

  if p_customer is not null and (coalesce(p_customer ->> 'customer_name', '') <> '' or coalesce(p_customer ->> 'customer_email', '') <> '' or coalesce(p_customer ->> 'customer_phone', '') <> '') then
    insert into buildtag.vehicle_customer_records (vehicle_id, organization_id, customer_name, customer_email, customer_phone, notes, created_by_user_id)
    values (vid, p_org, left(coalesce(p_customer ->> 'customer_name', ''), 120), left(lower(coalesce(p_customer ->> 'customer_email', '')), 200),
            left(coalesce(p_customer ->> 'customer_phone', ''), 40), left(coalesce(p_customer ->> 'notes', ''), 2000), uid);
  end if;

  if coalesce(p_add_to_crew, true) then
    select c.id into crew_id from buildtag.crews c where c.organization_id = p_org;
    if crew_id is not null then
      insert into buildtag.crew_builds (crew_id, vehicle_id, organization_id, added_by_user_id) values (crew_id, vid, p_org, uid) on conflict do nothing;
    end if;
  end if;
  return vid;
end;
$$;
revoke execute on function buildtag.org_create_vehicle(uuid, jsonb, buildtag.vehicle_relationship_type[], jsonb, boolean) from public;
grant execute on function buildtag.org_create_vehicle(uuid, jsonb, buildtag.vehicle_relationship_type[], jsonb, boolean) to authenticated;

-- Business build list. Customer name only from the business's own record;
-- after a claim the business sees "Claimed", never the owner's account.
create or replace function buildtag.org_builds(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (buildtag.is_org_member(p_org, 'staff') or buildtag.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'vehicle_id', v.id, 'slug', v.slug, 'year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim, 'nickname', v.nickname,
      'hero_image_url', v.hero_image_url, 'visibility', v.visibility, 'status', v.status, 'ownership_status', v.ownership_status,
      'scan_count', v.scan_count, 'like_count', v.like_count, 'created_at', v.created_at,
      'mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id),
      'org_mod_count', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and m.created_by_organization_id = p_org),
      'roles', (select coalesce(jsonb_agg(distinct r.relationship_type), '[]'::jsonb) from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = p_org and r.ended_at is null),
      'can_edit', v.owner_id is null,
      'qr_code', (select q.code from buildtag.qr_codes q where q.vehicle_id = v.id order by q.created_at limit 1),
      'qr_status', (select q.status from buildtag.qr_codes q where q.vehicle_id = v.id order by q.created_at limit 1),
      'customer_name', (select cr.customer_name from buildtag.vehicle_customer_records cr where cr.vehicle_id = v.id and cr.organization_id = p_org),
      'claim', (select jsonb_build_object('id', c.id, 'status', c.status, 'code_hint', c.code_hint, 'expires_at', c.expires_at, 'created_at', c.created_at, 'claimed_at', c.claimed_at, 'invite_sent_at', c.invite_sent_at)
                  from buildtag.vehicle_claims c where c.vehicle_id = v.id and c.organization_id = p_org order by c.created_at desc limit 1),
      'in_crew', exists (select 1 from buildtag.crew_builds cb join buildtag.crews cr on cr.id = cb.crew_id where cb.vehicle_id = v.id and cr.organization_id = p_org),
      'orders', (select count(distinct o.id) from buildtag.orders o join buildtag.order_items oi on oi.order_id = o.id
                   join buildtag.tag_production_snapshots s on s.id = oi.production_snapshot_id
                  where s.vehicle_id = v.id and o.organization_id = p_org and o.status <> 'cancelled')
    ) order by v.created_at desc)
    from buildtag.vehicles v
    where exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = p_org and r.ended_at is null)
       or exists (select 1 from buildtag.modifications m where m.vehicle_id = v.id and m.created_by_organization_id = p_org)
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.org_builds(uuid) from public;
grant execute on function buildtag.org_builds(uuid) to authenticated;

-- Dashboard numbers: only what the data can actually support.
create or replace function buildtag.org_dashboard(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare o buildtag.organizations;
begin
  if not (buildtag.is_org_member(p_org, 'staff') or buildtag.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into o from buildtag.organizations where id = p_org;
  return (
    with builds as (
      select v.* from buildtag.vehicles v
       where exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = p_org and r.relationship_type = 'creator')
    )
    select jsonb_build_object(
      'organization', jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug, 'status', o.status, 'verified_status', o.verified_status, 'organization_type', o.organization_type),
      'builds_created', (select count(*) from builds),
      'claimed', (select count(*) from builds where owner_id is not null),
      'awaiting_claim', (select count(*) from builds where owner_id is null),
      'active_claims', (select count(*) from buildtag.vehicle_claims c where c.organization_id = p_org and c.status = 'active'),
      'buildtags_ordered', coalesce((select sum(oi.quantity) from buildtag.orders ord join buildtag.order_items oi on oi.order_id = ord.id
                                      where ord.organization_id = p_org and ord.status not in ('cancelled', 'refunded', 'draft')), 0),
      'active_buildtags', (select count(*) from buildtag.qr_codes q join builds b on b.id = q.vehicle_id where q.status = 'active'),
      'total_scans', coalesce((select sum(scan_count) from builds), 0),
      'documented_mods', (select count(*) from buildtag.modifications m where m.created_by_organization_id = p_org),
      'recent_builds', coalesce((select jsonb_agg(jsonb_build_object('vehicle_id', b.id, 'slug', b.slug, 'year', b.year, 'make', b.make, 'model', b.model, 'nickname', b.nickname, 'hero_image_url', b.hero_image_url, 'ownership_status', b.ownership_status, 'created_at', b.created_at) order by b.created_at desc)
                                   from (select * from builds order by created_at desc limit 5) b), '[]'::jsonb),
      'recent_claims', coalesce((select jsonb_agg(jsonb_build_object('vehicle_id', v.id, 'slug', v.slug, 'year', v.year, 'make', v.make, 'model', v.model, 'claimed_at', c.claimed_at) order by c.claimed_at desc)
                                   from (select * from buildtag.vehicle_claims where organization_id = p_org and status = 'claimed' order by claimed_at desc limit 5) c
                                   join buildtag.vehicles v on v.id = c.vehicle_id), '[]'::jsonb),
      'top_scanned', coalesce((select jsonb_agg(jsonb_build_object('vehicle_id', b.id, 'slug', b.slug, 'year', b.year, 'make', b.make, 'model', b.model, 'nickname', b.nickname, 'scan_count', b.scan_count) order by b.scan_count desc)
                                 from (select * from builds where scan_count > 0 order by scan_count desc limit 5) b), '[]'::jsonb)
    )
  );
end;
$$;
revoke execute on function buildtag.org_dashboard(uuid) from public;
grant execute on function buildtag.org_dashboard(uuid) to authenticated;

-- Which business (if any) the caller is working for on this vehicle.
create or replace function buildtag.vehicle_manage_context(p_vehicle_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'is_owner', exists (select 1 from buildtag.vehicles v where v.id = p_vehicle_id and v.owner_id = auth.uid()),
    'organization', (
      select jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug, 'organization_type', o.organization_type)
        from buildtag.vehicle_relationships r join buildtag.organizations o on o.id = r.organization_id
       where r.vehicle_id = p_vehicle_id and r.ended_at is null and r.relationship_type in ('creator', 'builder', 'dealer')
         and buildtag.org_can_work(o.id, 'staff')
       order by r.created_at limit 1)
  );
$$;
revoke execute on function buildtag.vehicle_manage_context(uuid) from public;
grant execute on function buildtag.vehicle_manage_context(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Orders: the purchaser can be a business. Vehicle ownership never moves orders.
-- -----------------------------------------------------------------------------
alter table buildtag.orders add column organization_id uuid references buildtag.organizations (id) on delete set null;
alter table buildtag.tag_production_snapshots add column organization_id uuid references buildtag.organizations (id) on delete set null;
create index orders_organization_idx on buildtag.orders (organization_id, created_at desc) where organization_id is not null;
create index snapshots_organization_idx on buildtag.tag_production_snapshots (organization_id) where organization_id is not null;

-- A snapshot for a business-managed vehicle is purchased by that business.
create or replace function buildtag.snapshots_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare owner uuid;
begin
  if new.vehicle_id is not null and new.organization_id is null then
    select v.owner_id into owner from buildtag.vehicles v where v.id = new.vehicle_id;
    if owner is null then
      select r.organization_id into new.organization_id
        from buildtag.vehicle_relationships r
       where r.vehicle_id = new.vehicle_id and r.ended_at is null and r.organization_id is not null
         and r.relationship_type in ('creator', 'builder', 'dealer') and buildtag.is_org_member(r.organization_id, 'staff')
       order by r.created_at limit 1;
    end if;
  end if;
  return new;
end;
$$;
create trigger tag_production_snapshots_before_insert before insert on buildtag.tag_production_snapshots for each row execute function buildtag.snapshots_before_insert();

create policy snapshots_select_org on buildtag.tag_production_snapshots for select to authenticated
  using (buildtag.is_org_member(organization_id, 'manager'));
create policy orders_select_org on buildtag.orders for select to authenticated
  using (buildtag.is_org_member(organization_id, 'manager'));

create or replace function buildtag.owns_order(p_order_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from buildtag.orders o where o.id = p_order_id
                   and (o.user_id = (select auth.uid()) or buildtag.is_org_member(o.organization_id, 'manager')));
$$;

create or replace function buildtag.place_order(p_snapshot_id uuid, p_quantity integer, p_shipping jsonb, p_proof_approved boolean default false)
returns uuid language plpgsql security definer volatile set search_path = '' as $$
declare
  uid uuid := auth.uid(); snap buildtag.tag_production_snapshots; spec buildtag.print_specifications; oid uuid;
  unit integer; subtotal integer; shipping integer := 599;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 500 then raise exception 'invalid quantity' using errcode = '22023'; end if;
  if not coalesce(p_proof_approved, false) then raise exception 'Approve the final proof to continue.' using errcode = 'P0001'; end if;
  select * into snap from buildtag.tag_production_snapshots where id = p_snapshot_id and user_id = uid;
  if not found then raise exception 'snapshot not found' using errcode = 'P0002'; end if;
  if snap.validation_status = 'failed' then raise exception 'artwork failed validation' using errcode = 'P0001'; end if;
  if exists (select 1 from buildtag.order_items oi join buildtag.orders o on o.id = oi.order_id where oi.production_snapshot_id = snap.id and o.status not in ('cancelled')) then
    raise exception 'This proof already has an order. Open it from your orders.' using errcode = 'P0001';
  end if;
  select * into spec from buildtag.print_specifications where id = snap.print_specification_id;
  if not found or not spec.available or spec.provider_sku is null then
    raise exception 'this material is not available for order yet' using errcode = 'P0001';
  end if;
  unit := spec.price_cents;
  if p_quantity >= 10 then unit := (unit * 0.8)::integer; elsif p_quantity >= 3 then unit := (unit * 0.9)::integer; end if;
  subtotal := unit * p_quantity;
  if subtotal >= 5000 then shipping := 0; end if;
  insert into buildtag.orders (
    user_id, organization_id, status, payment_status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
    shipping_name, shipping_company, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_phone,
    customer_email, customer_notes, fulfillment_provider, proof_approved_at
  ) values (
    uid, snap.organization_id, 'awaiting_payment', 'unpaid', subtotal, shipping, 0, subtotal + shipping, spec.currency,
    left(coalesce(p_shipping ->> 'name', ''), 120), left(coalesce(p_shipping ->> 'company', ''), 120), left(coalesce(p_shipping ->> 'line1', ''), 200), left(coalesce(p_shipping ->> 'line2', ''), 200),
    left(coalesce(p_shipping ->> 'city', ''), 120), left(coalesce(p_shipping ->> 'state', ''), 80), left(coalesce(p_shipping ->> 'postal_code', ''), 20),
    left(coalesce(p_shipping ->> 'country', 'US'), 2), left(coalesce(p_shipping ->> 'phone', ''), 40),
    left(coalesce(p_shipping ->> 'email', ''), 200), left(coalesce(p_shipping ->> 'notes', ''), 1000), spec.provider, now()
  ) returning id into oid;
  insert into buildtag.order_items (order_id, product_type, production_snapshot_id, print_specification_id, description, quantity, unit_price_cents, total_price_cents,
                                    product_sku, product_name, width, height, units, material, finish)
  values (oid, spec.product_type, snap.id, spec.id, spec.product_name || ' ' || snap.width || 'x' || snap.height || snap.units || ' ' || spec.name, p_quantity, unit, subtotal,
          spec.sku, spec.product_name, snap.width, snap.height, snap.units, snap.material, snap.finish);
  insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id) values (oid, 'draft', 'awaiting_payment', 'Order placed, proof approved by customer', 'customer', uid);
  return oid;
end; $$;

create or replace function buildtag.org_orders(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (buildtag.is_org_member(p_org, 'manager') or buildtag.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status, 'total_cents', o.total_cents,
      'currency', o.currency, 'created_at', o.created_at, 'placed_by', (select p.username from buildtag.profiles p where p.id = o.user_id),
      'quantity', (select sum(oi.quantity) from buildtag.order_items oi where oi.order_id = o.id),
      'vehicle', (select jsonb_build_object('year', v.year, 'make', v.make, 'model', v.model, 'nickname', v.nickname, 'slug', v.slug)
                    from buildtag.order_items oi join buildtag.tag_production_snapshots s on s.id = oi.production_snapshot_id
                    join buildtag.vehicles v on v.id = s.vehicle_id where oi.order_id = o.id limit 1)
    ) order by o.created_at desc)
    from buildtag.orders o where o.organization_id = p_org
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.org_orders(uuid) from public;
grant execute on function buildtag.org_orders(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Business inquiries (B2B leads). Written only through submit_business_inquiry;
-- readable only by admins.
-- -----------------------------------------------------------------------------
create table buildtag.business_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  business_name text not null check (char_length(business_name) between 1 and 160),
  email text not null check (char_length(email) between 3 and 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null default '' check (char_length(phone) <= 40),
  website text not null default '' check (char_length(website) <= 300),
  business_type text not null check (business_type in ('dealership', 'performance_shop', 'custom_shop', 'motorcycle_shop', 'tuner', 'installer', 'manufacturer', 'dealer_group', 'other')),
  industry text not null default '' check (industry in ('', 'automotive', 'motorcycle', 'off_road', 'other')),
  location_count text not null default '' check (char_length(location_count) <= 20),
  builds_per_month text not null default '' check (char_length(builds_per_month) <= 20),
  interests text[] not null default '{}',
  message text not null default '' check (char_length(message) <= 4000),
  status buildtag.business_inquiry_status not null default 'new',
  source text not null default 'business_page' check (char_length(source) <= 60),
  admin_notes text not null default '' check (char_length(admin_notes) <= 8000),
  submitter_key text,
  submitted_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_inquiries_status_idx on buildtag.business_inquiries (status, created_at desc);
create index business_inquiries_submitter_idx on buildtag.business_inquiries (submitter_key, created_at desc);
create trigger business_inquiries_set_updated_at before update on buildtag.business_inquiries for each row execute function buildtag.set_updated_at();
alter table buildtag.business_inquiries enable row level security;
grant select on buildtag.business_inquiries to authenticated;
create policy business_inquiries_admin_select on buildtag.business_inquiries for select to authenticated using (buildtag.is_admin());

create or replace function buildtag.submit_business_inquiry(p jsonb, p_submitter_key text default null)
returns uuid language plpgsql security definer volatile set search_path = ''
as $$
declare
  iid uuid;
  allowed text[] := array['customer_buildtags', 'customer_claiming', 'shop_profile', 'crews', 'bulk_buildtags', 'analytics', 'custom_branding', 'api_integration', 'dealer_group', 'oem_partnership'];
  picked text[];
begin
  if p_submitter_key is not null and (
       select count(*) from buildtag.business_inquiries b where b.submitter_key = p_submitter_key and b.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many inquiries from this connection. Try again later or email us.' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(distinct x), '{}') into picked
    from jsonb_array_elements_text(coalesce(p -> 'interests', '[]'::jsonb)) x where x = any(allowed);
  insert into buildtag.business_inquiries (name, business_name, email, phone, website, business_type, industry, location_count, builds_per_month, interests, message, source, submitter_key, submitted_by_user_id)
  values (
    left(trim(coalesce(p ->> 'name', '')), 120), left(trim(coalesce(p ->> 'business_name', '')), 160), left(lower(trim(coalesce(p ->> 'email', ''))), 200),
    left(trim(coalesce(p ->> 'phone', '')), 40), left(trim(coalesce(p ->> 'website', '')), 300),
    coalesce(nullif(p ->> 'business_type', ''), 'other'), coalesce(p ->> 'industry', ''),
    left(coalesce(p ->> 'location_count', ''), 20), left(coalesce(p ->> 'builds_per_month', ''), 20), picked,
    left(coalesce(p ->> 'message', ''), 4000), left(coalesce(nullif(p ->> 'source', ''), 'business_page'), 60), p_submitter_key, auth.uid()
  ) returning id into iid;
  return iid;
end;
$$;
revoke execute on function buildtag.submit_business_inquiry(jsonb, text) from public;
grant execute on function buildtag.submit_business_inquiry(jsonb, text) to anon, authenticated;

create or replace function buildtag.admin_update_business_inquiry(p_id uuid, p_status buildtag.business_inquiry_status default null, p_notes text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update buildtag.business_inquiries
     set status = coalesce(p_status, status), admin_notes = coalesce(left(p_notes, 8000), admin_notes)
   where id = p_id;
end;
$$;
revoke execute on function buildtag.admin_update_business_inquiry(uuid, buildtag.business_inquiry_status, text) from public;
grant execute on function buildtag.admin_update_business_inquiry(uuid, buildtag.business_inquiry_status, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Admin: organization activation and verification
-- -----------------------------------------------------------------------------
create or replace function buildtag.admin_list_organizations(p_query text default '')
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when buildtag.is_admin() then coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'slug', o.slug, 'organization_type', o.organization_type, 'status', o.status,
      'verified_status', o.verified_status, 'created_at', o.created_at, 'email', o.email, 'phone', o.phone, 'website_url', o.website_url,
      'location_text', o.location_text,
      'owner_username', (select p.username from buildtag.organization_members m join buildtag.profiles p on p.id = m.user_id
                          where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1),
      'member_count', (select count(*) from buildtag.organization_members m where m.organization_id = o.id and m.status = 'active'),
      'build_count', (select count(*) from buildtag.vehicle_relationships r where r.organization_id = o.id and r.relationship_type = 'creator')
    ) order by (o.status = 'pending') desc, o.created_at desc)
    from buildtag.organizations o
    where coalesce(p_query, '') = '' or o.name ilike '%' || p_query || '%' or o.slug ilike '%' || p_query || '%'
  ), '[]'::jsonb) else null end;
$$;
revoke execute on function buildtag.admin_list_organizations(text) from public;
grant execute on function buildtag.admin_list_organizations(text) to authenticated;

create or replace function buildtag.admin_set_organization(p_org uuid, p_status buildtag.organization_status default null, p_verified buildtag.verification_status default null, p_type buildtag.organization_type default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update buildtag.organizations
     set status = coalesce(p_status, status), verified_status = coalesce(p_verified, verified_status), organization_type = coalesce(p_type, organization_type)
   where id = p_org;
end;
$$;
revoke execute on function buildtag.admin_set_organization(uuid, buildtag.organization_status, buildtag.verification_status, buildtag.organization_type) from public;
grant execute on function buildtag.admin_set_organization(uuid, buildtag.organization_status, buildtag.verification_status, buildtag.organization_type) to authenticated;

notify pgrst, 'reload schema';
