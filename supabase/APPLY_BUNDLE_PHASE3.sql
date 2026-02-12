-- APPLY_BUNDLE_PHASE3.sql
-- ONE4Team Phase 3 (Matches + football stats) bundle
--
-- Safe to paste into Supabase SQL Editor.
-- Applies:
--  - competitions, matches
--  - match_lineups, match_events
--  - match_votes (player of the match voting)
--  - player_match_stats, custom_stat_definitions, season_awards
--
-- Recommended order on a fresh project:
--   1) supabase/APPLY_BUNDLE_BASELINE.sql
--   2) supabase/APPLY_BUNDLE_PHASE1.sql
--   3) supabase/APPLY_BUNDLE_PHASE0_RLS.sql
--   4) supabase/APPLY_BUNDLE_PHASE2.sql
--   5) this bundle

begin;

-- ============================================================
-- 1) competitions
-- ============================================================
create table if not exists public.competitions (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  season text,
  competition_type text not null default 'league',
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitions enable row level security;

drop trigger if exists update_competitions_updated_at on public.competitions;
create trigger update_competitions_updated_at before update on public.competitions
for each row execute function public.update_updated_at();

create policy if not exists "Members can view competitions" on public.competitions
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Admins can create competitions" on public.competitions
for insert to authenticated
with check (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can update competitions" on public.competitions
for update to authenticated
using (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can delete competitions" on public.competitions
for delete to authenticated
using (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- 2) matches
-- ============================================================
create table if not exists public.matches (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  opponent text not null,
  is_home boolean not null default true,
  match_date timestamptz not null,
  location text,
  status text not null default 'scheduled',
  home_score integer,
  away_score integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.matches enable row level security;

drop trigger if exists update_matches_updated_at on public.matches;
create trigger update_matches_updated_at before update on public.matches
for each row execute function public.update_updated_at();

create policy if not exists "Members can view matches" on public.matches
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Admins can create matches" on public.matches
for insert to authenticated
with check (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can update matches" on public.matches
for update to authenticated
using (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can delete matches" on public.matches
for delete to authenticated
using (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- 3) match_lineups
-- ============================================================
create table if not exists public.match_lineups (
  id uuid not null default gen_random_uuid() primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  position text,
  is_starter boolean not null default true,
  jersey_number integer,
  created_at timestamptz not null default now(),
  unique(match_id, membership_id)
);

alter table public.match_lineups enable row level security;

create policy if not exists "Members can view lineups" on public.match_lineups
for select to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.is_member_of_club(auth.uid(), m.club_id)));

create policy if not exists "Admins can manage lineups" on public.match_lineups
for insert to authenticated
with check (exists (select 1 from public.matches m where m.id = match_id and public.is_club_admin(auth.uid(), m.club_id)));

create policy if not exists "Admins can update lineups" on public.match_lineups
for update to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.is_club_admin(auth.uid(), m.club_id)));

create policy if not exists "Admins can delete lineups" on public.match_lineups
for delete to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.is_club_admin(auth.uid(), m.club_id)));

-- ============================================================
-- 4) match_events
-- ============================================================
create table if not exists public.match_events (
  id uuid not null default gen_random_uuid() primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid references public.club_memberships(id) on delete set null,
  event_type text not null,
  minute integer,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.match_events enable row level security;

create policy if not exists "Members can view match events" on public.match_events
for select to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.is_member_of_club(auth.uid(), m.club_id)));

create policy if not exists "Admins can create match events" on public.match_events
for insert to authenticated
with check (exists (select 1 from public.matches m where m.id = match_id and public.is_club_admin(auth.uid(), m.club_id)));

create policy if not exists "Admins can update match events" on public.match_events
for update to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.is_club_admin(auth.uid(), m.club_id)));

create policy if not exists "Admins can delete match events" on public.match_events
for delete to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.is_club_admin(auth.uid(), m.club_id)));

-- ============================================================
-- 5) match_votes
-- ============================================================
create table if not exists public.match_votes (
  id uuid not null default gen_random_uuid() primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  voted_for_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(match_id, voter_membership_id)
);

alter table public.match_votes enable row level security;

create policy if not exists "Members can vote in their club" on public.match_votes
for insert to authenticated
with check (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Members can view votes in their club" on public.match_votes
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Members can update own vote" on public.match_votes
for update to authenticated
using (exists (select 1 from public.club_memberships cm where cm.id = match_votes.voter_membership_id and cm.user_id = auth.uid()));

create policy if not exists "Members can delete own vote" on public.match_votes
for delete to authenticated
using (exists (select 1 from public.club_memberships cm where cm.id = match_votes.voter_membership_id and cm.user_id = auth.uid()));

-- ============================================================
-- 6) player_match_stats
-- ============================================================
create table if not exists public.player_match_stats (
  id uuid not null default gen_random_uuid() primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  stat_name text not null,
  stat_value numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(match_id, membership_id, stat_name)
);

alter table public.player_match_stats enable row level security;

create policy if not exists "Members can view stats" on public.player_match_stats
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Admins can manage stats" on public.player_match_stats
for all to authenticated
using (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- 7) custom_stat_definitions
-- ============================================================
create table if not exists public.custom_stat_definitions (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  sport text not null default 'Football',
  stat_name text not null,
  stat_category text not null default 'general',
  stat_icon text default '📊',
  created_at timestamptz not null default now(),
  unique(club_id, stat_name)
);

alter table public.custom_stat_definitions enable row level security;

create policy if not exists "Members can view stat definitions" on public.custom_stat_definitions
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Admins can manage stat definitions" on public.custom_stat_definitions
for all to authenticated
using (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- 8) season_awards
-- ============================================================
create table if not exists public.season_awards (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  season text not null,
  award_type text not null,
  award_name text not null,
  award_icon text default '🏆',
  created_at timestamptz not null default now(),
  unique(club_id, season, award_type)
);

alter table public.season_awards enable row level security;

create policy if not exists "Members can view awards" on public.season_awards
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

create policy if not exists "Admins can manage awards" on public.season_awards
for all to authenticated
using (public.is_club_admin(auth.uid(), club_id));

commit;
