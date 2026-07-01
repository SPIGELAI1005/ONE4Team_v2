-- Shop products: idempotent import keys + JAKO master data fields.

alter table public.shop_products
  add column if not exists import_key text,
  add column if not exists external_url text,
  add column if not exists price_max_eur numeric(10,2),
  add column if not exists product_meta jsonb not null default '{}'::jsonb;

-- NULL import_key allowed multiple times per club (manual products); non-null keys are unique.
create unique index if not exists shop_products_club_import_key_idx
  on public.shop_products (club_id, import_key);
