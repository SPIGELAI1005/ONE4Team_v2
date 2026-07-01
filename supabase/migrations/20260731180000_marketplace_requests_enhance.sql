-- Marketplace requests: provider targeting, quantity, invites, and RLS hardening.

alter table public.marketplace_requests
  add column if not exists provider_type_wanted text
    check (provider_type_wanted is null or provider_type_wanted in (
      'sponsor', 'supplier', 'service_provider', 'consultant'
    ));

alter table public.marketplace_requests
  add column if not exists quantity text;

create index if not exists marketplace_requests_provider_type_idx
  on public.marketplace_requests(provider_type_wanted)
  where provider_type_wanted is not null;

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

drop policy if exists marketplace_request_invites_select on public.marketplace_request_invites;
create policy marketplace_request_invites_select
  on public.marketplace_request_invites for select to authenticated
  using (
    exists (
      select 1 from public.marketplace_requests r
      where r.id = marketplace_request_invites.request_id
        and public.is_club_admin(auth.uid(), r.club_id)
    )
    or exists (
      select 1 from public.marketplace_provider_profiles p
      where p.id = marketplace_request_invites.provider_profile_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists marketplace_request_invites_manage_club on public.marketplace_request_invites;
create policy marketplace_request_invites_manage_club
  on public.marketplace_request_invites for all to authenticated
  using (
    exists (
      select 1 from public.marketplace_requests r
      where r.id = marketplace_request_invites.request_id
        and public.is_club_admin(auth.uid(), r.club_id)
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_requests r
      where r.id = marketplace_request_invites.request_id
        and public.is_club_admin(auth.uid(), r.club_id)
    )
  );

drop policy if exists marketplace_requests_select on public.marketplace_requests;
create policy marketplace_requests_select
  on public.marketplace_requests for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or (
      status in ('open', 'offers_received')
      and visibility = 'marketplace'
      and exists (
        select 1 from public.marketplace_provider_profiles p
        where p.owner_user_id = auth.uid()
          and p.listing_status = 'active'
          and (provider_type_wanted is null or p.provider_type = provider_type_wanted)
      )
    )
    or (
      status in ('open', 'offers_received')
      and visibility = 'invited_providers_only'
      and exists (
        select 1
        from public.marketplace_request_invites i
        join public.marketplace_provider_profiles p on p.id = i.provider_profile_id
        where i.request_id = marketplace_requests.id
          and p.owner_user_id = auth.uid()
          and p.listing_status = 'active'
      )
    )
  );
