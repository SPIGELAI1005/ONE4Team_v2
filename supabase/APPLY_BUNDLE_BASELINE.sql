-- ONE4Team — APPLY_BUNDLE_BASELINE.sql
--
-- Purpose:
--   Create the baseline schema + helpers needed for local/dev and for building
--   Phase 0/1 on top. This is the “start here on a fresh Supabase project” bundle.
--
-- Usage:
--   Supabase Dashboard → SQL Editor → paste/run this file.
--
-- Notes:
--   - Designed to be idempotent-ish. If any statement fails, stop and fix.
--   - Phase 1 bundle: supabase/APPLY_BUNDLE_PHASE1.sql
--   - Phase 0 hardening: supabase/APPLY_BUNDLE_PHASE0_RLS.sql

create extension if not exists pgcrypto;

-- =============================================================
-- 0) Core role enum
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'admin', 'trainer', 'player', 'staff', 'member', 'parent',
      'sponsor', 'supplier', 'service_provider', 'consultant'
    );
  end if;
end $$;

-- =============================================================
-- 1) clubs
-- =============================================================

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  is_public boolean not null default true,
  logo_url text,
  primary_color text default '#C4952A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

-- =============================================================
-- 2) profiles (auto-created)
-- =============================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- =============================================================
-- 3) club_memberships
-- =============================================================

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'member',
  position text,
  age_group text,
  team text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NOTE: original migration used UNIQUE (club_id, user_id, role)
  -- We keep that here for compatibility with existing code.
  unique (club_id, user_id, role)
);

create index if not exists idx_club_memberships_club_id on public.club_memberships(club_id);
create index if not exists idx_club_memberships_user_id on public.club_memberships(user_id);
create index if not exists idx_club_memberships_role on public.club_memberships(role);

alter table public.club_memberships enable row level security;

-- =============================================================
-- 4) Helper functions (SECURITY DEFINER)
-- =============================================================

create or replace function public.is_member_of_club(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_memberships
    where user_id = _user_id and club_id = _club_id
  );
$$;

create or replace function public.is_club_admin(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_memberships
    where user_id = _user_id and club_id = _club_id and role = 'admin'
  );
$$;

-- =============================================================
-- 5) updated_at trigger
-- =============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_clubs_updated_at on public.clubs;
create trigger update_clubs_updated_at before update on public.clubs
for each row execute function public.update_updated_at();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at();

drop trigger if exists update_memberships_updated_at on public.club_memberships;
create trigger update_memberships_updated_at before update on public.club_memberships
for each row execute function public.update_updated_at();

-- =============================================================
-- 6) Auto-create profile on signup
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =============================================================
-- 7) Baseline RLS policies (minimum viable)
-- =============================================================

-- clubs
-- Public clubs are visible; members can see their clubs.
create policy if not exists "Public clubs visible to everyone"
  on public.clubs for select
  using (is_public = true);

create policy if not exists "Members can see their clubs"
  on public.clubs for select
  using (public.is_member_of_club(auth.uid(), id));

create policy if not exists "Authenticated users can create clubs"
  on public.clubs for insert
  with check (auth.uid() is not null);

create policy if not exists "Admins can update their club"
  on public.clubs for update
  using (public.is_club_admin(auth.uid(), id));

-- profiles
create policy if not exists "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy if not exists "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy if not exists "Club members can view fellow members profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.club_memberships m1
      join public.club_memberships m2 on m2.club_id = m1.club_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.user_id
    )
  );

-- club_memberships
create policy if not exists "Users can view own memberships"
  on public.club_memberships for select
  using (auth.uid() = user_id);

create policy if not exists "Admins can view all club memberships"
  on public.club_memberships for select
  using (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can add members"
  on public.club_memberships for insert
  with check (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can update memberships"
  on public.club_memberships for update
  using (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "Admins can remove members"
  on public.club_memberships for delete
  using (public.is_club_admin(auth.uid(), club_id));

-- =============================================================
-- 8) Seed helper (optional)
-- =============================================================

-- Create a club and assign the creator as admin in one transaction.
create or replace function public.create_club_with_admin(
  _name text,
  _slug text,
  _description text default null,
  _is_public boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _user_id uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _name is null or length(trim(_name)) = 0 then
    raise exception 'Club name is required';
  end if;

  insert into public.clubs (name, slug, description, is_public)
  values (trim(_name), _slug, trim(_description), _is_public)
  returning id into _club_id;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (_club_id, _user_id, 'admin', 'active');

  return _club_id;
end;
$$;

-- End of baseline bundle
