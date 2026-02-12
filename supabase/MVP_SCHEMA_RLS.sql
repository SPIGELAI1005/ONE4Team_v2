-- ONE4Team — MVP Schema + RLS (Football-first)
--
-- STATUS: DRAFT / REFERENCE ONLY
--
-- This file is a conceptual MVP schema draft. It overlaps with the actual
-- schema used by the app (`supabase/migrations/*.sql`) and also defines tables
-- that are not migrated in this repo.
--
-- Source of truth:
-- - `supabase/migrations/*.sql`
-- - `supabase/APPLY_BUNDLE_BASELINE.sql` + Phase bundles
--
-- For details, see: `supabase/SCHEMA_STATUS.md`
--
-- Intent: MVP-minimal, SaaS-correct tenant isolation by club_id.
-- Apply in Supabase SQL Editor ONLY if you understand the overlap.
--
-- Notes:
-- - Uses TEXT columns + CHECK constraints (keeps migrations simple).
-- - Uses SECURITY DEFINER helpers for membership/role checks to avoid RLS recursion.
-- - Assumes `auth.users` exists (Supabase Auth).

create extension if not exists pgcrypto;

-- =============================================================
-- 1) Core: clubs
-- =============================================================

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

-- =============================================================
-- 2) Core: club_memberships
-- =============================================================

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active' check (status in ('invited','active','disabled')),
  team_id uuid,
  position text,
  age_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create index if not exists idx_club_memberships_club_id on public.club_memberships(club_id);
create index if not exists idx_club_memberships_user_id on public.club_memberships(user_id);
create index if not exists idx_club_memberships_role on public.club_memberships(role);

alter table public.club_memberships enable row level security;

-- =============================================================
-- 3) Helper functions (SECURITY DEFINER)
-- =============================================================

-- Membership check: active membership only
create or replace function public.is_club_member(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships m
    where m.club_id = p_club_id
      and m.user_id = p_user_id
      and m.status = 'active'
  );
$$;

-- Admin check
create or replace function public.is_club_admin(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships m
    where m.club_id = p_club_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and m.role = 'admin'
  );
$$;

-- Trainer check
create or replace function public.is_club_trainer(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships m
    where m.club_id = p_club_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and m.role in ('trainer','admin')
  );
$$;

grant execute on function public.is_club_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_club_admin(uuid, uuid) to anon, authenticated;
grant execute on function public.is_club_trainer(uuid, uuid) to anon, authenticated;

-- =============================================================
-- 4) RLS policies: clubs
-- =============================================================

-- Members can read their clubs; public can read public club front data (minimal)
create policy if not exists "clubs_select_member_or_public"
on public.clubs for select
using (
  is_public = true
  or public.is_club_member(id, auth.uid())
);

-- Any authenticated user can create a club
create policy if not exists "clubs_insert_authenticated"
on public.clubs for insert
with check (auth.uid() is not null);

-- Only admins can update their club
create policy if not exists "clubs_update_admin"
on public.clubs for update
using (public.is_club_admin(id, auth.uid()))
with check (public.is_club_admin(id, auth.uid()));

-- =============================================================
-- 5) RLS policies: club_memberships
-- =============================================================

-- Members can view memberships within their club
create policy if not exists "club_memberships_select_club_members"
on public.club_memberships for select
using (public.is_club_member(club_id, auth.uid()));

-- Admins can manage memberships (insert/update)
create policy if not exists "club_memberships_insert_admin"
on public.club_memberships for insert
with check (public.is_club_admin(club_id, auth.uid()));

create policy if not exists "club_memberships_update_admin"
on public.club_memberships for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- Members can update their own profile attributes (position/team/age_group)
create policy if not exists "club_memberships_update_self_attributes"
on public.club_memberships for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================================
-- 6) Invite-only onboarding
-- =============================================================

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  email text,
  role text not null,
  token_hash text not null unique,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_invites_club_id on public.club_invites(club_id);

alter table public.club_invites enable row level security;

create policy if not exists "club_invites_select_admin"
on public.club_invites for select
using (public.is_club_admin(club_id, auth.uid()));

create policy if not exists "club_invites_insert_admin"
on public.club_invites for insert
with check (public.is_club_admin(club_id, auth.uid()));

create policy if not exists "club_invites_update_admin"
on public.club_invites for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- Public invite requests (for "request invite" funnel)
create table if not exists public.club_invite_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_club_invite_requests_club_id on public.club_invite_requests(club_id);
create index if not exists idx_club_invite_requests_status on public.club_invite_requests(status);

alter table public.club_invite_requests enable row level security;

-- Anyone can submit a request if the club is public
create policy if not exists "club_invite_requests_insert_public"
on public.club_invite_requests for insert
with check (
  exists (select 1 from public.clubs c where c.id = club_id and c.is_public = true)
);

-- Admins can read/manage requests
create policy if not exists "club_invite_requests_select_admin"
on public.club_invite_requests for select
using (public.is_club_admin(club_id, auth.uid()));

create policy if not exists "club_invite_requests_update_admin"
on public.club_invite_requests for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- =============================================================
-- 7) Activities + attendance (trainings/matches/events)
-- =============================================================

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  type text not null check (type in ('training','match','event')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  team_id uuid,
  -- match-specific fields (nullable)
  opponent text,
  is_home boolean,
  home_score integer,
  away_score integer,
  status text default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_club_id on public.activities(club_id);
create index if not exists idx_activities_starts_at on public.activities(starts_at);

alter table public.activities enable row level security;

create policy if not exists "activities_select_members"
on public.activities for select
using (public.is_club_member(club_id, auth.uid()));

create policy if not exists "activities_write_trainer"
on public.activities for insert
with check (public.is_club_trainer(club_id, auth.uid()));

create policy if not exists "activities_update_trainer"
on public.activities for update
using (public.is_club_trainer(club_id, auth.uid()))
with check (public.is_club_trainer(club_id, auth.uid()));

create table if not exists public.activity_attendance (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  status text not null check (status in ('invited','confirmed','declined','attended')),
  created_at timestamptz not null default now(),
  unique (activity_id, membership_id)
);

create index if not exists idx_activity_attendance_activity_id on public.activity_attendance(activity_id);
create index if not exists idx_activity_attendance_membership_id on public.activity_attendance(membership_id);

alter table public.activity_attendance enable row level security;

-- Read attendance if member of the club that owns the activity
create policy if not exists "attendance_select_members"
on public.activity_attendance for select
using (
  exists (
    select 1
    from public.activities a
    where a.id = activity_attendance.activity_id
      and public.is_club_member(a.club_id, auth.uid())
  )
);

-- Trainers/admin can write attendance for their club
create policy if not exists "attendance_write_trainer"
on public.activity_attendance for insert
with check (
  exists (
    select 1
    from public.activities a
    where a.id = activity_attendance.activity_id
      and public.is_club_trainer(a.club_id, auth.uid())
  )
);

create policy if not exists "attendance_update_trainer"
on public.activity_attendance for update
using (
  exists (
    select 1
    from public.activities a
    where a.id = activity_attendance.activity_id
      and public.is_club_trainer(a.club_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.activities a
    where a.id = activity_attendance.activity_id
      and public.is_club_trainer(a.club_id, auth.uid())
  )
);

-- =============================================================
-- 8) Match events (football-first stats)
-- =============================================================

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  membership_id uuid references public.club_memberships(id) on delete set null,
  event_type text not null check (event_type in ('goal','assist','yellow_card','red_card','substitution_in','substitution_out')),
  minute integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_match_events_activity_id on public.match_events(activity_id);
create index if not exists idx_match_events_membership_id on public.match_events(membership_id);

alter table public.match_events enable row level security;

create policy if not exists "match_events_select_members"
on public.match_events for select
using (
  exists (
    select 1
    from public.activities a
    where a.id = match_events.activity_id
      and public.is_club_member(a.club_id, auth.uid())
  )
);

create policy if not exists "match_events_write_trainer"
on public.match_events for insert
with check (
  exists (
    select 1
    from public.activities a
    where a.id = match_events.activity_id
      and public.is_club_trainer(a.club_id, auth.uid())
  )
);

-- =============================================================
-- 9) Manual dues tracking (no Stripe v1)
-- =============================================================

create table if not exists public.membership_dues (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  due_date date not null,
  amount_cents integer,
  currency text,
  status text not null default 'due' check (status in ('due','paid','waived')),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_membership_dues_club_id on public.membership_dues(club_id);
create index if not exists idx_membership_dues_membership_id on public.membership_dues(membership_id);
create index if not exists idx_membership_dues_status on public.membership_dues(status);

alter table public.membership_dues enable row level security;

create policy if not exists "dues_select_members"
on public.membership_dues for select
using (public.is_club_member(club_id, auth.uid()));

create policy if not exists "dues_write_admin"
on public.membership_dues for insert
with check (public.is_club_admin(club_id, auth.uid()));

create policy if not exists "dues_update_admin"
on public.membership_dues for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- =============================================================
-- 10) Partner stub
-- =============================================================

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  type text not null default 'other' check (type in ('sponsor','supplier','service_provider','consultant','other')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_partners_club_id on public.partners(club_id);

alter table public.partners enable row level security;

create policy if not exists "partners_select_members"
on public.partners for select
using (public.is_club_member(club_id, auth.uid()));

create policy if not exists "partners_write_admin"
on public.partners for insert
with check (public.is_club_admin(club_id, auth.uid()));

create policy if not exists "partners_update_admin"
on public.partners for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- =============================================================
-- 11) AI request logging (workflow-first)
-- =============================================================

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('training_plan','admin_digest')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_requests_club_id on public.ai_requests(club_id);

alter table public.ai_requests enable row level security;

create policy if not exists "ai_requests_select_members"
on public.ai_requests for select
using (public.is_club_member(club_id, auth.uid()));

create policy if not exists "ai_requests_insert_members"
on public.ai_requests for insert
with check (public.is_club_member(club_id, auth.uid()) and auth.uid() = user_id);
