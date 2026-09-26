-- =============================================================================
-- 0019: manage BuildTags admins from the Admin area.
-- =============================================================================
--   * An admin can make any existing account an admin, or remove admin from
--     another admin (Admin → Members).
--   * Nobody can remove their own admin role, and the last admin can never be
--     removed, so the site can't be locked out of Admin by accident.
--   * admins rows remember who granted them. RLS on buildtag.admins is
--     unchanged (users see only their own row); the list goes through
--     admin_list_admins().
-- =============================================================================

alter table buildtag.admins add column if not exists granted_by_user_id uuid references auth.users (id) on delete set null;

create or replace function buildtag.admin_set_admin(p_user_id uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then raise exception 'No such user.' using errcode = 'P0001'; end if;
  if p_admin then
    insert into buildtag.admins (user_id, granted_by_user_id) values (p_user_id, uid) on conflict (user_id) do nothing;
  else
    if p_user_id = uid then raise exception 'You can''t remove your own admin role. Ask another admin.' using errcode = 'P0001'; end if;
    -- serialize removals so two admins can't remove each other at once
    lock table buildtag.admins in share row exclusive mode;
    if (select count(*) from buildtag.admins) <= 1 then raise exception 'BuildTags needs at least one admin.' using errcode = 'P0001'; end if;
    delete from buildtag.admins where user_id = p_user_id;
  end if;
end;
$$;
revoke execute on function buildtag.admin_set_admin(uuid, boolean) from public;
grant execute on function buildtag.admin_set_admin(uuid, boolean) to authenticated;

create or replace function buildtag.admin_list_admins()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', a.user_id, 'username', p.username, 'display_name', p.display_name, 'email', u.email, 'created_at', a.created_at,
      'granted_by', (select gp.username from buildtag.profiles gp where gp.id = a.granted_by_user_id)
    ) order by a.created_at)
    from buildtag.admins a
    join auth.users u on u.id = a.user_id
    left join buildtag.profiles p on p.id = a.user_id
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.admin_list_admins() from public;
grant execute on function buildtag.admin_list_admins() to authenticated;

notify pgrst, 'reload schema';
