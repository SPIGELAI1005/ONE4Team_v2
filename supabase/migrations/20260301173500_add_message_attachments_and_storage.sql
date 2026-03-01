-- Add attachment support for chat messages and storage policies.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do update
set public = false;

drop policy if exists "chat_attachments_member_read" on storage.objects;
create policy "chat_attachments_member_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_member_of_club(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "chat_attachments_member_insert" on storage.objects;
create policy "chat_attachments_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_member_of_club(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "chat_attachments_member_update" on storage.objects;
create policy "chat_attachments_member_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_member_of_club(auth.uid(), split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'chat-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_member_of_club(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "chat_attachments_member_delete" on storage.objects;
create policy "chat_attachments_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_member_of_club(auth.uid(), split_part(name, '/', 1)::uuid)
);
