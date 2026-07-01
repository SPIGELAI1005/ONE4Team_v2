-- Repair: ensure marketplace provider image bucket exists (logo/cover uploads).
-- Safe to re-run if 20260731210000 was applied before Storage API picked up the bucket.

insert into storage.buckets (id, name, public, file_size_limit)
values ('images-marketplace-providers', 'images-marketplace-providers', true, 5242880)
on conflict (id) do update set
  public = true,
  file_size_limit = coalesce(storage.buckets.file_size_limit, excluded.file_size_limit);

drop policy if exists "marketplace_provider_images_public_read" on storage.objects;
create policy "marketplace_provider_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'images-marketplace-providers');

drop policy if exists "marketplace_provider_images_owner_insert" on storage.objects;
create policy "marketplace_provider_images_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images-marketplace-providers'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and auth.uid() = split_part(name, '/', 1)::uuid
  and split_part(name, '/', 2) in ('logo', 'cover')
);

drop policy if exists "marketplace_provider_images_owner_update" on storage.objects;
create policy "marketplace_provider_images_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images-marketplace-providers'
  and auth.uid() = split_part(name, '/', 1)::uuid
)
with check (
  bucket_id = 'images-marketplace-providers'
  and auth.uid() = split_part(name, '/', 1)::uuid
  and split_part(name, '/', 2) in ('logo', 'cover')
);

drop policy if exists "marketplace_provider_images_owner_delete" on storage.objects;
create policy "marketplace_provider_images_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images-marketplace-providers'
  and auth.uid() = split_part(name, '/', 1)::uuid
);
