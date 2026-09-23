-- 0005: ensure_profile() is called by the dashboard layout and page in
-- parallel on a user's first visit. Both saw "no profile" and both inserted;
-- the loser raised profiles_pkey and the first page load showed an error.
-- Now a concurrent insert is tolerated and the existing row is returned.

create or replace function buildtag.ensure_profile()
returns buildtag.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing buildtag.profiles;
  meta jsonb;
  base text;
  candidate text;
  n integer := 0;
  email_text text;
  attempt integer := 0;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into existing from buildtag.profiles where id = uid;
  if found then
    return existing;
  end if;

  select u.raw_user_meta_data, u.email into meta, email_text from auth.users u where u.id = uid;

  base := lower(regexp_replace(coalesce(meta ->> 'username', split_part(coalesce(email_text, ''), '@', 1), ''), '[^a-z0-9_]', '', 'g'));
  if char_length(base) < 3 then
    base := 'builder' || lower(buildtag.short_code(4));
  end if;
  base := left(base, 26);

  loop
    attempt := attempt + 1;
    candidate := base;
    n := 0;
    while exists (select 1 from buildtag.profiles p where lower(p.username) = candidate) loop
      n := n + 1;
      candidate := base || n::text;
    end loop;

    begin
      insert into buildtag.profiles (id, username, display_name)
      values (uid, candidate, coalesce(nullif(meta ->> 'display_name', ''), initcap(replace(candidate, '_', ' '))))
      on conflict (id) do nothing
      returning * into existing;
      exit;
    exception
      when unique_violation then
        -- username taken by a concurrent insert; try again with the next suffix
        if attempt >= 5 then
          raise;
        end if;
    end;
  end loop;

  if existing.id is null then
    -- another request created it first
    select * into existing from buildtag.profiles where id = uid;
  end if;

  return existing;
end;
$$;
