-- Profile avatar uploads for authenticated users.

insert into storage.buckets (id, name, public)
values ('images-avatars', 'images-avatars', true)
on conflict (id) do update
set public = true;

drop policy if exists "images_avatars_public_read" on storage.objects;
create policy "images_avatars_public_read"
on storage.objects
for select
to public
using (bucket_id = 'images-avatars');

drop policy if exists "images_avatars_owner_insert" on storage.objects;
create policy "images_avatars_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "images_avatars_owner_update" on storage.objects;
create policy "images_avatars_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'images-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "images_avatars_owner_delete" on storage.objects;
create policy "images_avatars_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);
