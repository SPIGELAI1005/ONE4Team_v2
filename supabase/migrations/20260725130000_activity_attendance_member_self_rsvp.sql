-- Allow club members to self-RSVP (insert/update own attendance row).
-- Fixes public club + Activities RSVP failing with RLS when no trainer invite row exists.

create table if not exists public.activity_attendance (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'confirmed', 'declined', 'attended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, membership_id)
);

alter table public.activity_attendance add column if not exists club_id uuid references public.clubs(id) on delete cascade;
alter table public.activity_attendance add column if not exists notes text;
alter table public.activity_attendance add column if not exists updated_at timestamptz not null default now();

-- Backfill club_id from activities when missing (legacy rows).
update public.activity_attendance aa
set club_id = a.club_id
from public.activities a
where aa.activity_id = a.id
  and aa.club_id is null;

create index if not exists idx_activity_attendance_club_id on public.activity_attendance(club_id);
create index if not exists idx_activity_attendance_activity_id on public.activity_attendance(activity_id);
create index if not exists idx_activity_attendance_membership_id on public.activity_attendance(membership_id);

alter table public.activity_attendance enable row level security;

drop trigger if exists update_activity_attendance_updated_at on public.activity_attendance;
create trigger update_activity_attendance_updated_at
  before update on public.activity_attendance
  for each row execute function public.update_updated_at();

-- Remove legacy trainer-only write policies (MVP schema).
drop policy if exists "attendance_select_members" on public.activity_attendance;
drop policy if exists "attendance_write_trainer" on public.activity_attendance;
drop policy if exists "attendance_update_trainer" on public.activity_attendance;

drop policy if exists "Members can view attendance" on public.activity_attendance;
create policy "Members can view attendance"
  on public.activity_attendance for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "Trainers/admins can invite attendance" on public.activity_attendance;
create policy "Trainers/admins can invite attendance"
  on public.activity_attendance for insert to authenticated
  with check (
    public.is_club_trainer(auth.uid(), club_id)
    and exists (
      select 1 from public.club_memberships m
      where m.id = activity_attendance.membership_id
        and m.club_id = activity_attendance.club_id
        and m.status = 'active'
    )
  );

drop policy if exists "Members can self RSVP insert" on public.activity_attendance;
create policy "Members can self RSVP insert"
  on public.activity_attendance for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and exists (
      select 1 from public.club_memberships m
      where m.id = activity_attendance.membership_id
        and m.user_id = auth.uid()
        and m.club_id = activity_attendance.club_id
        and m.status = 'active'
    )
  );

drop policy if exists "Members can update own attendance" on public.activity_attendance;
create policy "Members can update own attendance"
  on public.activity_attendance for update to authenticated
  using (
    exists (
      select 1 from public.club_memberships m
      where m.id = activity_attendance.membership_id
        and m.user_id = auth.uid()
        and m.club_id = activity_attendance.club_id
    )
  )
  with check (
    exists (
      select 1 from public.club_memberships m
      where m.id = activity_attendance.membership_id
        and m.user_id = auth.uid()
        and m.club_id = activity_attendance.club_id
    )
  );

drop policy if exists "Trainers/admins can update attendance" on public.activity_attendance;
create policy "Trainers/admins can update attendance"
  on public.activity_attendance for update to authenticated
  using (public.is_club_trainer(auth.uid(), club_id))
  with check (public.is_club_trainer(auth.uid(), club_id));

drop policy if exists "Trainers/admins can delete attendance" on public.activity_attendance;
create policy "Trainers/admins can delete attendance"
  on public.activity_attendance for delete to authenticated
  using (public.is_club_trainer(auth.uid(), club_id));
