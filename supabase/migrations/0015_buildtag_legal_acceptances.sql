-- =============================================================================
-- 0015: legal acceptance audit trail.
-- =============================================================================
-- One append-only row per affirmative acceptance: Terms and Privacy at signup
-- (or re-acceptance after a material update), custom artwork approval at
-- checkout, business authorization when a shop creates a customer vehicle or
-- an organization, and claim confirmation when a customer claims a vehicle.
--
--   * Rows are written only by security-definer functions, always for
--     auth.uid() (or, at signup, for the user row being created). Ordinary
--     users can read their own rows and can never edit or delete them.
--   * Historical rows are never rewritten. A new Terms version means a new
--     row, never an update. Changing the legal operator (for example moving
--     from a sole proprietorship to an LLC) does not touch old rows.
--   * Minimal metadata: a truncated user agent string. No IP addresses.
--   * Rows are removed only when the account itself is deleted (cascade).
-- Current document versions live in src/lib/legal/config.ts.
-- =============================================================================

create type buildtag.legal_document_type as enum (
  'terms', 'privacy', 'disclaimer', 'refunds',
  'custom_product_approval', 'business_authorization', 'vehicle_claim_confirmation'
);

create table buildtag.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type buildtag.legal_document_type not null,
  document_version text not null check (document_version ~ '^[0-9A-Za-z._-]{1,40}$'),
  accepted_at timestamptz not null default now(),
  acceptance_context text not null check (
    acceptance_context in ('signup', 'reaccept', 'checkout', 'business_create_vehicle', 'organization_create', 'vehicle_claim')
  ),
  subject_type text check (subject_type in ('order', 'vehicle', 'organization', 'snapshot')),
  subject_id uuid,
  related jsonb not null default '{}'::jsonb check (jsonb_typeof(related) = 'object' and pg_column_size(related) < 2000),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index legal_acceptances_user_idx on buildtag.legal_acceptances (user_id, document_type, accepted_at desc);
create index legal_acceptances_subject_idx on buildtag.legal_acceptances (subject_type, subject_id);

-- Append-only: no updates ever; deletes only once the account is gone (the
-- auth.users cascade runs after the parent row is removed).
create or replace function buildtag.legal_acceptances_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'legal acceptances are immutable' using errcode = '42501';
  end if;
  if exists (select 1 from auth.users u where u.id = old.user_id) then
    raise exception 'legal acceptances are immutable' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger legal_acceptances_immutable
  before update or delete on buildtag.legal_acceptances
  for each row execute function buildtag.legal_acceptances_guard();

alter table buildtag.legal_acceptances enable row level security;

create policy legal_acceptances_select_own on buildtag.legal_acceptances
  for select to authenticated
  using (user_id = auth.uid() or buildtag.is_admin());

revoke all on buildtag.legal_acceptances from anon, authenticated;
grant select on buildtag.legal_acceptances to authenticated;

-- -----------------------------------------------------------------------------
-- record_legal_acceptance: the only write path for signed-in users.
-- -----------------------------------------------------------------------------
create or replace function buildtag.record_legal_acceptance(
  p_document_type buildtag.legal_document_type,
  p_document_version text,
  p_context text,
  p_subject_type text default null,
  p_subject_id uuid default null,
  p_related jsonb default '{}'::jsonb,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- An artwork approval can only be recorded against the caller's own order.
  if p_subject_type = 'order' and not exists (
    select 1 from buildtag.orders o where o.id = p_subject_id and o.user_id = uid
  ) then
    raise exception 'order not found' using errcode = '42501';
  end if;

  insert into buildtag.legal_acceptances (
    user_id, document_type, document_version, acceptance_context, subject_type, subject_id, related, user_agent
  ) values (
    uid, p_document_type, p_document_version, p_context, p_subject_type, p_subject_id,
    coalesce(p_related, '{}'::jsonb), left(nullif(p_user_agent, ''), 300)
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function buildtag.record_legal_acceptance(buildtag.legal_document_type, text, text, text, uuid, jsonb, text) from public;
grant execute on function buildtag.record_legal_acceptance(buildtag.legal_document_type, text, text, text, uuid, jsonb, text) to authenticated;

-- -----------------------------------------------------------------------------
-- my_legal_status: latest accepted version per document type for the caller.
-- The app compares these with the required versions in its config.
-- -----------------------------------------------------------------------------
create or replace function buildtag.my_legal_status()
returns table (document_type buildtag.legal_document_type, document_version text, accepted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (a.document_type) a.document_type, a.document_version, a.accepted_at
  from buildtag.legal_acceptances a
  where a.user_id = auth.uid() and a.document_type in ('terms', 'privacy')
  order by a.document_type, a.document_version desc, a.accepted_at desc;
$$;

revoke execute on function buildtag.my_legal_status() from public;
grant execute on function buildtag.my_legal_status() to authenticated;

-- -----------------------------------------------------------------------------
-- Signup: email confirmation means there is no session when the account is
-- created, so the signup form passes the accepted versions in the user
-- metadata (key "legal") and this trigger records them at insert time.
-- It never blocks a signup: without evidence, the app asks the user to accept
-- on first sign-in instead.
-- -----------------------------------------------------------------------------
create or replace function buildtag.record_signup_acceptances()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  legal jsonb := new.raw_user_meta_data -> 'legal';
  v_terms text := legal ->> 'terms_version';
  v_privacy text := legal ->> 'privacy_version';
  v_ua text := left(nullif(legal ->> 'user_agent', ''), 300);
begin
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'buildtag' or legal is null then
    return new;
  end if;
  begin
    if v_terms ~ '^[0-9A-Za-z._-]{1,40}$' then
      insert into buildtag.legal_acceptances (user_id, document_type, document_version, accepted_at, acceptance_context, user_agent)
      values (new.id, 'terms', v_terms, coalesce(new.created_at, now()), 'signup', v_ua);
    end if;
    if v_privacy ~ '^[0-9A-Za-z._-]{1,40}$' then
      insert into buildtag.legal_acceptances (user_id, document_type, document_version, accepted_at, acceptance_context, user_agent)
      values (new.id, 'privacy', v_privacy, coalesce(new.created_at, now()), 'signup', v_ua);
    end if;
  exception when others then
    raise warning 'record_signup_acceptances failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke execute on function buildtag.record_signup_acceptances() from public, anon, authenticated;

create trigger buildtag_record_signup_acceptances
  after insert on auth.users
  for each row execute function buildtag.record_signup_acceptances();
