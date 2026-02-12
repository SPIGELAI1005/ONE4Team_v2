-- APPLY_BUNDLE_PHASE2.sql
-- ONE4Team Phase 2 (Scheduling engine: activities + attendance) bundle
--
-- Safe to paste into Supabase SQL Editor.
-- Applies:
--  - activities table (club-scoped)
--  - activity_attendance table (club-scoped)
--  - RLS policies aligned with Phase 0 (member read, trainer/admin manage)
--
-- Recommended order on a fresh project:
--   1) supabase/APPLY_BUNDLE_BASELINE.sql
--   2) supabase/APPLY_BUNDLE_PHASE1.sql
--   3) supabase/APPLY_BUNDLE_PHASE0_RLS.sql
--   4) this bundle

begin;

-- ============================================================
-- 1) activities
-- ============================================================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  type text not null check (type in ('training','match','event')),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  team_id uuid references public.teams(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activities_club_id on public.activities(club_id);
create index if not exists idx_activities_starts_at on public.activities(starts_at);

alter table public.activities enable row level security;

drop trigger if exists update_activities_updated_at on public.activities;
create trigger update_activities_updated_at before update on public.activities
for each row execute function public.update_updated_at();

-- Read: members of club
create policy if not exists "Members can view activities" on public.activities
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

-- Write: trainers/admins
create policy if not exists "Trainers/admins can create activities" on public.activities
for insert to authenticated
with check (public.is_club_trainer(auth.uid(), club_id) and created_by = auth.uid());

create policy if not exists "Trainers/admins can update activities" on public.activities
for update to authenticated
using (public.is_club_trainer(auth.uid(), club_id))
with check (public.is_club_trainer(auth.uid(), club_id));

create policy if not exists "Trainers/admins can delete activities" on public.activities
for delete to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

-- ============================================================
-- 2) activity_attendance
-- ============================================================
create table if not exists public.activity_attendance (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','confirmed','declined','attended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, membership_id)
);

create index if not exists idx_activity_attendance_club_id on public.activity_attendance(club_id);
create index if not exists idx_activity_attendance_activity_id on public.activity_attendance(activity_id);
create index if not exists idx_activity_attendance_membership_id on public.activity_attendance(membership_id);

alter table public.activity_attendance enable row level security;

drop trigger if exists update_activity_attendance_updated_at on public.activity_attendance;
create trigger update_activity_attendance_updated_at before update on public.activity_attendance
for each row execute function public.update_updated_at();

-- Read: members of club
create policy if not exists "Members can view attendance" on public.activity_attendance
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

-- Trainer/admin can create attendance entries (invite)
create policy if not exists "Trainers/admins can invite attendance" on public.activity_attendance
for insert to authenticated
with check (
  public.is_club_trainer(auth.uid(), club_id)
  and exists (
    select 1 from public.club_memberships m
    where m.id = activity_attendance.membership_id
      and m.club_id = activity_attendance.club_id
      and m.status = 'active'
  )
);

-- Members can create their own attendance row (self-RSVP) if it doesn't exist yet
create policy if not exists "Members can self RSVP insert" on public.activity_attendance
for insert to authenticated
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

-- Members can update their own attendance row
create policy if not exists "Members can update own attendance" on public.activity_attendance
for update to authenticated
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

-- Trainers/admins can update any attendance row (mark attended etc.)
create policy if not exists "Trainers/admins can update attendance" on public.activity_attendance
for update to authenticated
using (public.is_club_trainer(auth.uid(), club_id))
with check (public.is_club_trainer(auth.uid(), club_id));

-- Trainers/admins can delete attendance rows
create policy if not exists "Trainers/admins can delete attendance" on public.activity_attendance
for delete to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

commit;
