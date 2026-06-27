-- Repair: public.notifications was recorded in migration history but missing on remote.
-- Restores table, RLS, indexes, and realtime publication for the Messages hub.

create table if not exists public.notifications (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  body text,
  notification_type text not null default 'general',
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_club_user_created
  on public.notifications(club_id, user_id, created_at desc);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can view their own notifications (in club)" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications (in club)" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications (in club)" on public.notifications;
drop policy if exists "Club admins can insert notifications" on public.notifications;
drop policy if exists "Members can insert notifications for their club" on public.notifications;

create policy "Users can view their own notifications (in club)"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id));

create policy "Users can update their own notifications (in club)"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id))
  with check (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id));

create policy "Users can delete their own notifications (in club)"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id));

create policy "Club admins can insert notifications"
  on public.notifications for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id));

create policy "Members can insert notifications for their club"
  on public.notifications for insert to authenticated
  with check (public.is_member_of_club(auth.uid(), club_id));

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
