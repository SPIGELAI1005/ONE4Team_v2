-- Per-club toggles for which blocks appear on /club/:slug (nav + section rendering).
-- Default: all sections visible (backward compatible).

alter table public.clubs
  add column if not exists public_page_sections jsonb not null default '{"about":true,"news":true,"teams":true,"shop":true,"media":true,"schedule":true,"events":true,"contact":true}'::jsonb;
