-- Multiple product images (max 3), public CDN URLs in JSON; image_url stays first image for backward compatibility.

alter table public.shop_products
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

update public.shop_products
set image_urls = jsonb_build_array(image_url)
where image_url is not null
  and trim(image_url) <> ''
  and (image_urls is null or image_urls = '[]'::jsonb);

create or replace function public.shop_products_enforce_image_urls()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.image_urls is null or jsonb_typeof(new.image_urls) <> 'array' then
    new.image_urls := '[]'::jsonb;
  end if;

  if jsonb_array_length(new.image_urls) = 0 and new.image_url is not null and trim(new.image_url) <> '' then
    new.image_urls := jsonb_build_array(new.image_url);
  end if;

  if jsonb_array_length(new.image_urls) > 3 then
    raise exception 'shop_products: at most 3 images per product';
  end if;

  if jsonb_array_length(new.image_urls) > 0 then
    new.image_url := nullif(trim(new.image_urls->>0), '');
  else
    new.image_url := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_shop_products_image_urls on public.shop_products;
create trigger trg_shop_products_image_urls
before insert or update on public.shop_products
for each row
execute function public.shop_products_enforce_image_urls();

-- Public bucket; club admins may upload only under their club_id prefix.
insert into storage.buckets (id, name, public, file_size_limit)
values ('shop-product-images', 'shop-product-images', true, 2097152)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = coalesce(excluded.file_size_limit, storage.buckets.file_size_limit);

drop policy if exists "shop_product_images_public_read" on storage.objects;
create policy "shop_product_images_public_read"
on storage.objects
for select
using (bucket_id = 'shop-product-images');

drop policy if exists "shop_product_images_admin_insert" on storage.objects;
create policy "shop_product_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "shop_product_images_admin_update" on storage.objects;
create policy "shop_product_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "shop_product_images_admin_delete" on storage.objects;
create policy "shop_product_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
);
