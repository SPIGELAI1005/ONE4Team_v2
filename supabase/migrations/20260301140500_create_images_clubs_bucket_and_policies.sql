-- Ensure club image uploads work out-of-the-box:
-- - create public bucket for club assets
-- - allow public reads
-- - restrict writes to club admins in their own club folder

insert into storage.buckets (id, name, public)
values ('images-clubs', 'images-clubs', true)
on conflict (id) do update
set public = true;

drop policy if exists "images_clubs_public_read" on storage.objects;
create policy "images_clubs_public_read"
on storage.objects
for select
using (bucket_id = 'images-clubs');

drop policy if exists "images_clubs_admin_insert" on storage.objects;
create policy "images_clubs_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "images_clubs_admin_update" on storage.objects;
create policy "images_clubs_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "images_clubs_admin_delete" on storage.objects;
create policy "images_clubs_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_club_admin(auth.uid(), split_part(name, '/', 1)::uuid)
);
