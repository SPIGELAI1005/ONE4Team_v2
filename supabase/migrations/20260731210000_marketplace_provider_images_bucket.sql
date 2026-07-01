-- Public assets for marketplace provider / supplier page branding (logo, cover).
-- Path: `{owner_user_id}/{logo|cover}/…` — only the owning user may write.

insert into storage.buckets (id, name, public, file_size_limit)
values ('images-marketplace-providers', 'images-marketplace-providers', true, 5242880)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = coalesce(excluded.file_size_limit, storage.buckets.file_size_limit);

drop policy if exists "marketplace_provider_images_public_read" on storage.objects;
create policy "marketplace_provider_images_public_read"
on storage.objects
for select
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
