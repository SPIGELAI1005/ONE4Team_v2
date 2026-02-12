-- APPLY_BUNDLE_PHASE1.sql
-- ONE4Team Phase 1 (Invite-only onboarding) bundle
--
-- Safe to paste into Supabase SQL Editor.
-- Applies:
--  - pgcrypto extension
--  - invite tables + RLS
--  - invite redemption RPC
--  - invite request hardening (RPC-only + rate limit) + admin revoke

-- ============================================================
-- 0) Extensions
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- 1) Invite tables + RLS
-- ============================================================
-- (from migrations/20260211124500_mvp_invites.sql)

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

create policy if not exists "club_invites_select_admin"
  on public.club_invites for select
  using (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "club_invites_insert_admin"
  on public.club_invites for insert
  with check (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "club_invites_update_admin"
  on public.club_invites for update
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

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

create policy if not exists "club_invite_requests_select_admin"
  on public.club_invite_requests for select
  using (public.is_club_admin(auth.uid(), club_id));

create policy if not exists "club_invite_requests_update_admin"
  on public.club_invite_requests for update
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ============================================================
-- 2) Invite redemption RPC
-- ============================================================
create or replace function public.redeem_club_invite(_token text)
returns table (
  club_id uuid,
  role public.app_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_inv public.club_invites%rowtype;
  v_user_id uuid;
  v_email text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _token is null or length(trim(_token)) < 10 then
    raise exception 'Invalid token';
  end if;

  v_hash := encode(digest(_token, 'sha256'), 'hex');

  select * into v_inv
  from public.club_invites
  where token_hash = v_hash
  limit 1;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_inv.used_at is not null then
    raise exception 'Invite already used';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'Invite expired';
  end if;

  if v_inv.email is not null then
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    if v_email = '' or v_email <> lower(v_inv.email) then
      raise exception 'Invite email mismatch';
    end if;
  end if;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (v_inv.club_id, v_user_id, v_inv.role, 'active')
  on conflict (club_id, user_id)
  do update set role = excluded.role, status = 'active';

  update public.club_invites
  set used_at = now()
  where id = v_inv.id;

  club_id := v_inv.club_id;
  role := v_inv.role;
  return next;
end;
$$;

revoke all on function public.redeem_club_invite(text) from public;
grant execute on function public.redeem_club_invite(text) to authenticated;

-- ============================================================
-- 3) Invite request hardening + admin revoke
-- ============================================================
create policy if not exists "club_invites_delete_admin"
  on public.club_invites for delete
  using (public.is_club_admin(auth.uid(), club_id));

-- Ensure public cannot insert directly; use RPC below
-- If the old public policy exists, drop it.
drop policy if exists "club_invite_requests_insert_public" on public.club_invite_requests;

create unique index if not exists uq_club_invite_requests_pending
  on public.club_invite_requests (club_id, lower(email))
  where status = 'pending';

create or replace function public.request_club_invite(
  _club_id uuid,
  _name text,
  _email text,
  _message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_email text;
  v_count int;
  v_id uuid;
begin
  if _club_id is null then
    raise exception 'Missing club id';
  end if;

  select c.is_public into v_is_public
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public invite requests';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'Name is required';
  end if;

  v_email := lower(trim(coalesce(_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Valid email is required';
  end if;

  select count(*) into v_count
  from public.club_invite_requests r
  where r.club_id = _club_id
    and lower(r.email) = v_email
    and r.created_at > now() - interval '24 hours';

  if v_count >= 3 then
    raise exception 'Too many requests. Please try again later.';
  end if;

  insert into public.club_invite_requests (club_id, name, email, message, status)
  values (_club_id, trim(_name), v_email, nullif(trim(coalesce(_message,'')),''), 'pending')
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this email.';
end;
$$;

revoke all on function public.request_club_invite(uuid, text, text, text) from public;
grant execute on function public.request_club_invite(uuid, text, text, text) to anon;
grant execute on function public.request_club_invite(uuid, text, text, text) to authenticated;
