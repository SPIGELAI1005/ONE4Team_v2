-- Expand clubs with profile and settings columns used by UI.
-- This closes fake-save gaps in Club Page Admin and Settings > Club.

alter table public.clubs
  add column if not exists cover_image_url text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists twitter_url text,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists default_language text not null default 'en',
  add column if not exists timezone text not null default 'Europe/Berlin',
  add column if not exists season_start_month integer not null default 8;
