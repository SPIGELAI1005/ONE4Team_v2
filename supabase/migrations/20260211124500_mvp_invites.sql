-- MVP: Invite-only onboarding + invite requests
-- Adds: club_invites, club_invite_requests
-- RLS uses existing helper functions in this project:
--   public.is_club_admin(uuid, uuid)
--
-- NOTE: token_hash should store a hash of the raw invite token (never store raw token).

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  email text,
  role public.app_role not null default 'member',
  token_hash text not null unique,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_invites_club_id on public.club_invites(club_id);

alter table public.club_invites enable row level security;

-- Admins can view invites for their club
drop policy if exists "club_invites_select_admin" on public.club_invites;
create policy "club_invites_select_admin"
  on public.club_invites for select
  using (public.is_club_admin(auth.uid(), club_id));

-- Admins can create invites
drop policy if exists "club_invites_insert_admin" on public.club_invites;
create policy "club_invites_insert_admin"
  on public.club_invites for insert
  with check (public.is_club_admin(auth.uid(), club_id));

-- Admins can update invites (e.g. mark used_at)
drop policy if exists "club_invites_update_admin" on public.club_invites;
create policy "club_invites_update_admin"
  on public.club_invites for update
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- Public invite request funnel
-- ============================================================

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

-- Anyone can submit an invite request IF club is public
drop policy if exists "club_invite_requests_insert_public" on public.club_invite_requests;
create policy "club_invite_requests_insert_public"
  on public.club_invite_requests for insert
  with check (
    exists (
      select 1 from public.clubs c
      where c.id = club_invite_requests.club_id
        and c.is_public = true
    )
  );

-- Admins can view requests
drop policy if exists "club_invite_requests_select_admin" on public.club_invite_requests;
create policy "club_invite_requests_select_admin"
  on public.club_invite_requests for select
  using (public.is_club_admin(auth.uid(), club_id));

-- Admins can update requests (approve/reject)
drop policy if exists "club_invite_requests_update_admin" on public.club_invite_requests;
create policy "club_invite_requests_update_admin"
  on public.club_invite_requests for update
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));
