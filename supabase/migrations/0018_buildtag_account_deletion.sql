-- =============================================================================
-- 0018: self-service account deletion.
-- =============================================================================
-- A signed-in user can delete their own account (Profile → Delete account).
--
--   * Blocked while the user is the only owner of a business, has an order in
--     progress (paid but not yet shipped, or with an artwork/production
--     issue), or has an active Stripe subscription. The dashboard shows each
--     blocker and how to clear it.
--   * Builds a business created and the user claimed go back to that
--     business as unclaimed (the decal on the vehicle keeps working). The
--     user's social links are removed from them. Every other vehicle the user
--     owns is deleted with its photos, parts, QR code and analytics.
--   * Orders are financial records: they are kept with user_id set to null
--     (see the Privacy Policy: "except what we need to keep for legal, tax,
--     accounting ..."). Drafts and unpaid orders are deleted.
--   * Everything else tied to the account goes through the existing
--     auth.users cascades (profile, crews, memberships, legal acceptances,
--     subscriptions row, designs, snapshots).
--   * Storage files (vehicle photos, avatar, tag assets) are removed by the
--     server action through the Storage API BEFORE calling delete_my_account,
--     because the storage policies need the rows to still exist.
-- =============================================================================

alter table buildtag.orders alter column user_id drop not null;
alter table buildtag.orders drop constraint orders_user_id_fkey;
alter table buildtag.orders add constraint orders_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;

-- Orders that must be finished (or cancelled by us) before the account can go.
create or replace function buildtag.order_in_progress(p_status buildtag.order_status)
returns boolean language sql immutable set search_path = ''
as $$
  select p_status::text not in ('draft', 'awaiting_payment', 'shipped', 'delivered', 'cancelled', 'refunded');
$$;

-- What deleting the caller's account would do, and what blocks it.
create or replace function buildtag.account_deletion_check()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  return (
    with owned as (
      select v.id, v.year, v.make, v.model, v.nickname,
             (select o.name from buildtag.vehicle_relationships r join buildtag.organizations o on o.id = r.organization_id
               where r.vehicle_id = v.id and r.relationship_type = 'creator' and r.ended_at is null
               order by r.created_at limit 1) as creator_org
        from buildtag.vehicles v where v.owner_id = uid
    )
    select jsonb_build_object(
      'sole_owner_of', coalesce((
        select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name)
          from buildtag.organizations o
          join buildtag.organization_members m on m.organization_id = o.id and m.user_id = uid and m.status = 'active' and m.role = 'owner'
         where not exists (select 1 from buildtag.organization_members x
                            where x.organization_id = o.id and x.user_id <> uid and x.status = 'active' and x.role = 'owner')
      ), '[]'::jsonb),
      'orders_in_progress', (select count(*) from buildtag.orders o where o.user_id = uid and buildtag.order_in_progress(o.status)),
      'active_subscription', exists (
        select 1 from buildtag.subscriptions s
         where s.user_id = uid and s.provider = 'stripe' and s.status in ('active', 'trialing', 'past_due')
           and (s.current_period_end is null or s.current_period_end > now())),
      'delete_vehicle_ids', coalesce((select jsonb_agg(id) from owned where creator_org is null), '[]'::jsonb),
      'deleted_vehicles', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'year', year, 'make', make, 'model', model, 'nickname', nickname))
                                      from owned where creator_org is null), '[]'::jsonb),
      'returned_vehicles', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'year', year, 'make', make, 'model', model, 'nickname', nickname, 'organization', creator_org))
                                       from owned where creator_org is not null), '[]'::jsonb),
      'kept_orders', (select count(*) from buildtag.orders o where o.user_id = uid and o.status::text not in ('draft', 'awaiting_payment'))
    )
  );
end;
$$;
revoke execute on function buildtag.account_deletion_check() from public;
grant execute on function buildtag.account_deletion_check() to authenticated;

create or replace function buildtag.delete_my_account(p_confirm text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  chk jsonb;
  returned uuid[];
  owned uuid[];
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_confirm is distinct from 'DELETE' then raise exception 'Type DELETE to confirm.' using errcode = 'P0001'; end if;

  chk := buildtag.account_deletion_check();
  if jsonb_array_length(chk -> 'sole_owner_of') > 0 then
    raise exception 'You are the only owner of %. Make someone else an owner or contact us to close it first.',
      (select string_agg(e ->> 'name', ', ') from jsonb_array_elements(chk -> 'sole_owner_of') e) using errcode = 'P0001';
  end if;
  if (chk ->> 'orders_in_progress')::int > 0 then
    raise exception 'You have an order in progress. Wait until it ships or contact us to cancel it.' using errcode = 'P0001';
  end if;
  if (chk ->> 'active_subscription')::boolean then
    raise exception 'Cancel your Pro subscription under Manage billing first.' using errcode = 'P0001';
  end if;

  select coalesce(array_agg((e ->> 'id')::uuid), '{}') into returned from jsonb_array_elements(chk -> 'returned_vehicles') e;
  select coalesce(array_agg(v.id), '{}') into owned from buildtag.vehicles v where v.owner_id = uid;

  -- Personal social accounts, on the profile and on every vehicle they own.
  delete from buildtag.social_links
   where (owner_type = 'profile' and owner_id = uid)
      or (owner_type = 'vehicle' and owner_id = any (owned));

  -- Business-created builds go back to the business, unclaimed.
  if cardinality(returned) > 0 then
    perform set_config('buildtag.ownership_change', 'on', true);
    perform set_config('buildtag.ownership_via', 'account_deleted', true);
    update buildtag.vehicles set owner_id = null, ownership_status = 'unclaimed' where id = any (returned);
    perform set_config('buildtag.ownership_change', '', true);
  end if;

  -- Person-only relationship rows (owner history, personal creator) cannot
  -- survive ON DELETE SET NULL: a relationship needs a user or a business.
  delete from buildtag.vehicle_relationships where user_id = uid and organization_id is null;

  -- Drafts and unpaid checkouts are not records worth keeping.
  delete from buildtag.orders where user_id = uid and status::text in ('draft', 'awaiting_payment');

  -- Run the cascade as the system, not as the user: row guards (for example
  -- organizations.created_by_user_id, provenance on business parts) would
  -- otherwise undo the ON DELETE SET NULL updates they see.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function buildtag.delete_my_account(text) from public;
grant execute on function buildtag.delete_my_account(text) to authenticated;

notify pgrst, 'reload schema';
