-- =============================================================================
-- BuildTag - row level security, storage buckets, PostgREST exposure
-- =============================================================================
-- Principles:
--   * anon has ZERO table privileges. Public reads go through the
--     `public_builds` view and the security-definer functions in 0002.
--   * authenticated users get owner-scoped CRUD on their own rows.
--   * admins (buildtag.admins) get read + moderation updates.
--   * analytics tables have no direct policies; they are written by
--     security-definer functions and read through vehicle_analytics().
-- =============================================================================

alter table buildtag.profiles        enable row level security;
alter table buildtag.admins          enable row level security;
alter table buildtag.subscriptions   enable row level security;
alter table buildtag.shops           enable row level security;
alter table buildtag.parts           enable row level security;
alter table buildtag.vehicles        enable row level security;
alter table buildtag.vehicle_photos  enable row level security;
alter table buildtag.modifications   enable row level security;
alter table buildtag.social_links    enable row level security;
alter table buildtag.qr_codes        enable row level security;
alter table buildtag.scan_events     enable row level security;
alter table buildtag.product_clicks  enable row level security;
alter table buildtag.social_clicks   enable row level security;
alter table buildtag.build_likes     enable row level security;
alter table buildtag.reports         enable row level security;
alter table buildtag.tag_designs     enable row level security;

-- Table privileges: only `authenticated` (RLS decides rows). anon gets nothing.
grant select, insert, update, delete on buildtag.profiles       to authenticated;
grant select                         on buildtag.admins         to authenticated;
grant select                         on buildtag.subscriptions  to authenticated;
grant select, insert, update, delete on buildtag.shops          to authenticated;
grant select                         on buildtag.parts          to authenticated;
grant select, insert, update, delete on buildtag.vehicles       to authenticated;
grant select, insert, update, delete on buildtag.vehicle_photos to authenticated;
grant select, insert, update, delete on buildtag.modifications  to authenticated;
grant select, insert, update, delete on buildtag.social_links   to authenticated;
grant select                         on buildtag.qr_codes       to authenticated;
grant select                         on buildtag.scan_events    to authenticated;
grant select                         on buildtag.product_clicks to authenticated;
grant select                         on buildtag.social_clicks  to authenticated;
grant select                         on buildtag.build_likes    to authenticated;
grant select, update                 on buildtag.reports        to authenticated;
grant select, insert, update, delete on buildtag.tag_designs    to authenticated;

grant usage, select on all sequences in schema buildtag to authenticated;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create policy profiles_select_own_or_admin on buildtag.profiles
  for select to authenticated
  using (id = (select auth.uid()) or buildtag.is_admin());

create policy profiles_insert_own on buildtag.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on buildtag.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- admins: a user can see only their own membership row
-- -----------------------------------------------------------------------------

create policy admins_select_self on buildtag.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- subscriptions: read your own. Writes arrive via a future billing webhook
-- (service role), never from the browser.
-- -----------------------------------------------------------------------------

create policy subscriptions_select_own on buildtag.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or buildtag.is_admin());

-- -----------------------------------------------------------------------------
-- shops: readable by any signed-in user (installer picker), writable by owner
-- -----------------------------------------------------------------------------

create policy shops_select_authenticated on buildtag.shops
  for select to authenticated
  using (true);

create policy shops_insert_own on buildtag.shops
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy shops_update_own on buildtag.shops
  for update to authenticated
  using (owner_id = (select auth.uid()) or buildtag.is_admin())
  with check (owner_id = (select auth.uid()) or buildtag.is_admin());

create policy shops_delete_own on buildtag.shops
  for delete to authenticated
  using (owner_id = (select auth.uid()) or buildtag.is_admin());

-- -----------------------------------------------------------------------------
-- parts: read-only catalog for signed-in users (suggestions)
-- -----------------------------------------------------------------------------

create policy parts_select_authenticated on buildtag.parts
  for select to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------

create policy vehicles_select_own_or_admin on buildtag.vehicles
  for select to authenticated
  using (owner_id = (select auth.uid()) or buildtag.is_admin());

create policy vehicles_insert_own on buildtag.vehicles
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy vehicles_update_own on buildtag.vehicles
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy vehicles_delete_own on buildtag.vehicles
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- vehicle_photos / modifications / tag_designs: scoped through vehicle owner
-- -----------------------------------------------------------------------------

create policy vehicle_photos_select on buildtag.vehicle_photos
  for select to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_admin());
create policy vehicle_photos_insert on buildtag.vehicle_photos
  for insert to authenticated
  with check (buildtag.owns_vehicle(vehicle_id));
create policy vehicle_photos_update on buildtag.vehicle_photos
  for update to authenticated
  using (buildtag.owns_vehicle(vehicle_id))
  with check (buildtag.owns_vehicle(vehicle_id));
create policy vehicle_photos_delete on buildtag.vehicle_photos
  for delete to authenticated
  using (buildtag.owns_vehicle(vehicle_id));

create policy modifications_select on buildtag.modifications
  for select to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_admin());
create policy modifications_insert on buildtag.modifications
  for insert to authenticated
  with check (buildtag.owns_vehicle(vehicle_id));
create policy modifications_update on buildtag.modifications
  for update to authenticated
  using (buildtag.owns_vehicle(vehicle_id))
  with check (buildtag.owns_vehicle(vehicle_id));
create policy modifications_delete on buildtag.modifications
  for delete to authenticated
  using (buildtag.owns_vehicle(vehicle_id));

create policy tag_designs_select on buildtag.tag_designs
  for select to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_admin());
create policy tag_designs_insert on buildtag.tag_designs
  for insert to authenticated
  with check (buildtag.owns_vehicle(vehicle_id));
create policy tag_designs_update on buildtag.tag_designs
  for update to authenticated
  using (buildtag.owns_vehicle(vehicle_id))
  with check (buildtag.owns_vehicle(vehicle_id));
create policy tag_designs_delete on buildtag.tag_designs
  for delete to authenticated
  using (buildtag.owns_vehicle(vehicle_id));

-- -----------------------------------------------------------------------------
-- social_links: owner resolved by owner_type
-- -----------------------------------------------------------------------------

create or replace function buildtag.owns_social_owner(p_type buildtag.social_owner_type, p_owner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select case p_type
    when 'profile' then p_owner_id = (select auth.uid())
    when 'vehicle' then buildtag.owns_vehicle(p_owner_id)
    when 'shop' then buildtag.owns_shop(p_owner_id)
    else false
  end;
$$;

revoke execute on function buildtag.owns_social_owner(buildtag.social_owner_type, uuid) from public;
grant execute on function buildtag.owns_social_owner(buildtag.social_owner_type, uuid) to authenticated;

create policy social_links_select on buildtag.social_links
  for select to authenticated
  using (buildtag.owns_social_owner(owner_type, owner_id) or buildtag.is_admin());
create policy social_links_insert on buildtag.social_links
  for insert to authenticated
  with check (buildtag.owns_social_owner(owner_type, owner_id));
create policy social_links_update on buildtag.social_links
  for update to authenticated
  using (buildtag.owns_social_owner(owner_type, owner_id))
  with check (buildtag.owns_social_owner(owner_type, owner_id));
create policy social_links_delete on buildtag.social_links
  for delete to authenticated
  using (buildtag.owns_social_owner(owner_type, owner_id));

-- -----------------------------------------------------------------------------
-- qr_codes: owners read their code. No owner writes (permanence). Admin
-- disable/restore goes through admin_set_qr_status().
-- -----------------------------------------------------------------------------

create policy qr_codes_select on buildtag.qr_codes
  for select to authenticated
  using (buildtag.owns_vehicle(vehicle_id) or buildtag.is_admin());

-- -----------------------------------------------------------------------------
-- analytics tables: admin read only; owners use vehicle_analytics()
-- -----------------------------------------------------------------------------

create policy scan_events_admin_select on buildtag.scan_events
  for select to authenticated using (buildtag.is_admin());
create policy product_clicks_admin_select on buildtag.product_clicks
  for select to authenticated using (buildtag.is_admin());
create policy social_clicks_admin_select on buildtag.social_clicks
  for select to authenticated using (buildtag.is_admin());
create policy build_likes_admin_select on buildtag.build_likes
  for select to authenticated using (buildtag.is_admin());

-- -----------------------------------------------------------------------------
-- reports: admins only (submission goes through submit_report())
-- -----------------------------------------------------------------------------

create policy reports_admin_select on buildtag.reports
  for select to authenticated using (buildtag.is_admin());
create policy reports_admin_update on buildtag.reports
  for update to authenticated using (buildtag.is_admin()) with check (buildtag.is_admin());

-- -----------------------------------------------------------------------------
-- Storage buckets
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('buildtag-photos', 'buildtag-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('buildtag-avatars', 'buildtag-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public buckets serve reads without policies. Writes are owner-scoped by the
-- first path segment: "<vehicle_id>/..." or "<user_id>/...".
create policy buildtag_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'buildtag-photos' and buildtag.owns_storage_vehicle(name));

create policy buildtag_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'buildtag-photos' and buildtag.owns_storage_vehicle(name))
  with check (bucket_id = 'buildtag-photos' and buildtag.owns_storage_vehicle(name));

create policy buildtag_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'buildtag-photos' and buildtag.owns_storage_vehicle(name));

create policy buildtag_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'buildtag-photos' and buildtag.owns_storage_vehicle(name));

create policy buildtag_avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'buildtag-avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'buildtag-avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'buildtag-avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'buildtag-avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'buildtag-avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- Expose the schema through PostgREST, APPEND-SAFELY (the project may host
-- other schemas; never overwrite the list).
-- -----------------------------------------------------------------------------

do $$
declare
  current_schemas text;
begin
  select coalesce(
    (select regexp_replace(cfg, '^pgrst\.db_schemas=', '')
       from pg_db_role_setting s
       join pg_roles r on r.oid = s.setrole,
            lateral unnest(s.setconfig) as cfg
      where r.rolname = 'authenticator'
        and cfg like 'pgrst.db_schemas=%'
      limit 1),
    null
  ) into current_schemas;

  if current_schemas is null then
    -- Fresh project: PostgREST default list plus ours.
    current_schemas := 'public, storage, graphql_public';
  end if;

  if position('buildtag' in current_schemas) = 0 then
    current_schemas := current_schemas || ', buildtag';
    execute format('alter role authenticator set pgrst.db_schemas = %L', current_schemas);
  end if;
end $$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
