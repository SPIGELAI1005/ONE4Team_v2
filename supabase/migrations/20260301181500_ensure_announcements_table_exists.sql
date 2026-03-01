create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete set null,
  title text not null,
  content text not null,
  priority text default 'normal',
  author_id uuid references auth.users(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop trigger if exists update_announcements_updated_at on public.announcements;
create trigger update_announcements_updated_at
before update on public.announcements
for each row execute function public.update_updated_at();

drop policy if exists "Members can view announcements" on public.announcements;
create policy "Members can view announcements"
on public.announcements
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "Admins can create announcements" on public.announcements;
create policy "Admins can create announcements"
on public.announcements
for insert
to authenticated
with check (public.is_club_admin(auth.uid(), club_id) and author_id = auth.uid());

drop policy if exists "Authors can update announcements" on public.announcements;
create policy "Authors can update announcements"
on public.announcements
for update
to authenticated
using (author_id = auth.uid());

drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can delete announcements"
on public.announcements
for delete
to authenticated
using (public.is_club_admin(auth.uid(), club_id));
