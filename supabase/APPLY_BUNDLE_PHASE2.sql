-- APPLY_BUNDLE_PHASE2.sql
-- ONE4Team Phase 2 (Teams + Scheduling engine: activities + attendance) bundle
--
-- Safe to paste into Supabase SQL Editor.
-- Applies:
--  - teams + team_players tables (prerequisite for activities)
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
-- 0) is_club_trainer helper (needed by RLS policies below)
--    Idempotent: CREATE OR REPLACE — safe if Phase 0 RLS already ran.
-- ============================================================
create or replace function public.is_club_trainer(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships
    where user_id = _user_id
      and club_id = _club_id
      and status = 'active'
      and role in ('trainer'::public.app_role, 'admin'::public.app_role)
  );
$$;

grant execute on function public.is_club_trainer(uuid, uuid) to anon, authenticated;

-- ============================================================
-- 0a) teams (required by activities.team_id FK)
-- ============================================================
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade not null,
  name text not null,
  sport text default 'Football',
  age_group text,
  coach_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;

drop trigger if exists update_teams_updated_at on public.teams;
create trigger update_teams_updated_at before update on public.teams
  for each row execute function public.update_updated_at();

-- Teams RLS
drop policy if exists "Members can view club teams" on public.teams;
create policy "Members can view club teams" on public.teams
  for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "Admins can manage teams" on public.teams;
create policy "Admins can manage teams" on public.teams
  for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can update teams" on public.teams;
create policy "Admins can update teams" on public.teams
  for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can delete teams" on public.teams;
create policy "Admins can delete teams" on public.teams
  for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- 0b) team_players (assignment of members to teams)
-- ============================================================
create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  membership_id uuid references public.club_memberships(id) on delete cascade not null,
  jersey_number int,
  created_at timestamptz not null default now(),
  unique (team_id, membership_id)
);

alter table public.team_players enable row level security;

drop policy if exists "Members can view team players" on public.team_players;
create policy "Members can view team players" on public.team_players
  for select to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and public.is_member_of_club(auth.uid(), t.club_id)));

drop policy if exists "Admins can manage team players" on public.team_players;
create policy "Admins can manage team players" on public.team_players
  for insert to authenticated
  with check (exists (select 1 from public.teams t where t.id = team_id and public.is_club_admin(auth.uid(), t.club_id)));

drop policy if exists "Admins can update team players" on public.team_players;
create policy "Admins can update team players" on public.team_players
  for update to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and public.is_club_admin(auth.uid(), t.club_id)));

drop policy if exists "Admins can delete team players" on public.team_players;
create policy "Admins can delete team players" on public.team_players
  for delete to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and public.is_club_admin(auth.uid(), t.club_id)));

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
drop policy if exists "Members can view activities" on public.activities;
create policy "Members can view activities" on public.activities
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

-- Write: trainers/admins
drop policy if exists "Trainers/admins can create activities" on public.activities;
create policy "Trainers/admins can create activities" on public.activities
for insert to authenticated
with check (public.is_club_trainer(auth.uid(), club_id) and created_by = auth.uid());

drop policy if exists "Trainers/admins can update activities" on public.activities;
create policy "Trainers/admins can update activities" on public.activities
for update to authenticated
using (public.is_club_trainer(auth.uid(), club_id))
with check (public.is_club_trainer(auth.uid(), club_id));

drop policy if exists "Trainers/admins can delete activities" on public.activities;
create policy "Trainers/admins can delete activities" on public.activities
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
drop policy if exists "Members can view attendance" on public.activity_attendance;
create policy "Members can view attendance" on public.activity_attendance
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

-- Trainer/admin can create attendance entries (invite)
drop policy if exists "Trainers/admins can invite attendance" on public.activity_attendance;
create policy "Trainers/admins can invite attendance" on public.activity_attendance
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
drop policy if exists "Members can self RSVP insert" on public.activity_attendance;
create policy "Members can self RSVP insert" on public.activity_attendance
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
drop policy if exists "Members can update own attendance" on public.activity_attendance;
create policy "Members can update own attendance" on public.activity_attendance
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
drop policy if exists "Trainers/admins can update attendance" on public.activity_attendance;
create policy "Trainers/admins can update attendance" on public.activity_attendance
for update to authenticated
using (public.is_club_trainer(auth.uid(), club_id))
with check (public.is_club_trainer(auth.uid(), club_id));

-- Trainers/admins can delete attendance rows
drop policy if exists "Trainers/admins can delete attendance" on public.activity_attendance;
create policy "Trainers/admins can delete attendance" on public.activity_attendance
for delete to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

commit;
