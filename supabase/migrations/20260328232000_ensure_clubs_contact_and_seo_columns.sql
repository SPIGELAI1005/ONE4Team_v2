-- Idempotent: public.clubs columns for Club Page Admin (contact, social, SEO, cover).
-- If an environment skipped 20260301101500_expand_clubs_profile_and_settings_columns,
-- PostgREST returns "Could not find the 'address' column ... in the schema cache".

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
  add column if not exists meta_description text;
