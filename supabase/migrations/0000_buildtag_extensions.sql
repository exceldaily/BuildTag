-- =============================================================================
-- BuildTag - extensions the schema depends on
-- =============================================================================
-- BuildTag moved to its own Supabase project (Sep 2026). A fresh project ships
-- pgcrypto and uuid-ossp; the schema also needs unaccent (slugify) and pg_trgm
-- (parts search). Idempotent, safe on projects that already have them.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
