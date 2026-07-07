-- Repair marketplace_requests 500 errors from RLS recursion.
--
-- marketplace_requests_select (20260731180000) references marketplace_request_invites;
-- marketplace_request_invites_select references marketplace_requests again → PostgREST 500.
--
-- Fix: SECURITY DEFINER helpers bypass RLS for cross-table checks.

-- Ensure enhance columns / invite table exist (idempotent if 20260731180000 was skipped).
alter table public.marketplace_requests
  add column if not exists provider_type_wanted text
    check (provider_type_wanted is null or provider_type_wanted in (
      'sponsor', 'supplier', 'service_provider', 'consultant'
    ));

alter table public.marketplace_requests
  add column if not exists quantity text;

create table if not exists public.marketplace_request_invites (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketplace_requests(id) on delete cascade,
  provider_profile_id uuid not null references public.marketplace_provider_profiles(id) on delete cascade,
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, provider_profile_id)
);

create index if not exists marketplace_request_invites_request_idx
  on public.marketplace_request_invites(request_id);

create index if not exists marketplace_request_invites_provider_idx
  on public.marketplace_request_invites(provider_profile_id);

alter table public.marketplace_request_invites enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER — no RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.marketplace_request_club_id(_request_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.club_id
  from public.marketplace_requests r
  where r.id = _request_id
  limit 1;
$$;

create or replace function public.user_is_invited_to_marketplace_request(
  _request_id uuid,
  _user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.marketplace_request_invites i
    join public.marketplace_provider_profiles p on p.id = i.provider_profile_id
    where i.request_id = _request_id
      and p.owner_user_id = _user_id
      and p.listing_status = 'active'
  );
$$;

create or replace function public.user_is_active_marketplace_provider(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.marketplace_provider_profiles p
    where p.owner_user_id = _user_id
      and p.listing_status = 'active'
  );
$$;

revoke all on function public.marketplace_request_club_id(uuid) from public;
grant execute on function public.marketplace_request_club_id(uuid) to authenticated;

revoke all on function public.user_is_invited_to_marketplace_request(uuid, uuid) from public;
grant execute on function public.user_is_invited_to_marketplace_request(uuid, uuid) to authenticated;

revoke all on function public.user_is_active_marketplace_provider(uuid) from public;
grant execute on function public.user_is_active_marketplace_provider(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- marketplace_request_invites policies (use helpers — no direct requests subquery)
-- ---------------------------------------------------------------------------
drop policy if exists marketplace_request_invites_select on public.marketplace_request_invites;
create policy marketplace_request_invites_select
  on public.marketplace_request_invites for select to authenticated
  using (
    public.is_club_admin(auth.uid(), public.marketplace_request_club_id(request_id))
    or exists (
      select 1
      from public.marketplace_provider_profiles p
      where p.id = marketplace_request_invites.provider_profile_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists marketplace_request_invites_manage_club on public.marketplace_request_invites;
create policy marketplace_request_invites_manage_club
  on public.marketplace_request_invites for all to authenticated
  using (
    public.is_club_admin(auth.uid(), public.marketplace_request_club_id(request_id))
  )
  with check (
    public.is_club_admin(auth.uid(), public.marketplace_request_club_id(request_id))
  );

-- ---------------------------------------------------------------------------
-- marketplace_requests select (invited branch uses helper)
-- ---------------------------------------------------------------------------
drop policy if exists marketplace_requests_select on public.marketplace_requests;
create policy marketplace_requests_select
  on public.marketplace_requests for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or (
      status in ('open', 'offers_received')
      and visibility = 'marketplace'
      and public.user_is_active_marketplace_provider(auth.uid())
      and (
        provider_type_wanted is null
        or exists (
          select 1
          from public.marketplace_provider_profiles p
          where p.owner_user_id = auth.uid()
            and p.listing_status = 'active'
            and p.provider_type = marketplace_requests.provider_type_wanted
        )
      )
    )
    or (
      status in ('open', 'offers_received')
      and visibility = 'invited_providers_only'
      and public.user_is_invited_to_marketplace_request(id, auth.uid())
    )
  );
