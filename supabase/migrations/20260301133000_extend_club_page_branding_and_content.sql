-- Extend clubs with richer public-page branding and content controls.

alter table public.clubs
  add column if not exists secondary_color text,
  add column if not exists tertiary_color text,
  add column if not exists support_color text,
  add column if not exists favicon_url text,
  add column if not exists reference_images jsonb not null default '[]'::jsonb;
