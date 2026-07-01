-- Marketplace & external provider portal (extends partners workflows).
-- Re-applied under 20260731170000 because version 20260731150000 was consumed by another migration.
-- Reuses: partners, partner_contracts, partner_invoices, partner_tasks, messages, club_tasks.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Provider marketplace profiles (global listings, owned by external users)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_provider_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider_type text not null
    check (provider_type in ('sponsor', 'supplier', 'service_provider', 'consultant')),
  partner_id uuid references public.partners(id) on delete set null,
  provider_name text not null,
  slug text unique,
  logo_url text,
  cover_image_url text,
  short_description text,
  detailed_description text,
  categories text[] not null default '{}',
  location text,
  service_area_km integer,
  availability_mode text check (availability_mode in ('remote', 'local', 'hybrid')),
  contact_person text,
  contact_email text,
  phone text,
  website text,
  packages jsonb not null default '[]'::jsonb,
  price_indication text,
  availability_notes text,
  reference_notes text[] not null default '{}',
  visibility text not null default 'private'
    check (visibility in ('private', 'marketplace_only', 'public')),
  listing_status text not null default 'draft'
    check (listing_status in ('draft', 'submitted_for_review', 'active', 'paused', 'rejected', 'archived')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified')),
  is_featured boolean not null default false,
  rejection_reason text,
  profile_completeness smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_provider_profiles_owner_idx
  on public.marketplace_provider_profiles(owner_user_id);
create index if not exists marketplace_provider_profiles_type_status_idx
  on public.marketplace_provider_profiles(provider_type, listing_status);
create index if not exists marketplace_provider_profiles_categories_gin
  on public.marketplace_provider_profiles using gin(categories);

drop trigger if exists update_marketplace_provider_profiles_updated_at on public.marketplace_provider_profiles;
create trigger update_marketplace_provider_profiles_updated_at
  before update on public.marketplace_provider_profiles
  for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Club procurement requests
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  visibility text not null default 'marketplace'
    check (visibility in ('private', 'invited_providers_only', 'marketplace')),
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  deadline date,
  location text,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'offers_received', 'accepted', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_requests_club_status_idx
  on public.marketplace_requests(club_id, status, created_at desc);
create index if not exists marketplace_requests_category_idx
  on public.marketplace_requests(category);

drop trigger if exists update_marketplace_requests_updated_at on public.marketplace_requests;
create trigger update_marketplace_requests_updated_at
  before update on public.marketplace_requests
  for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Provider offers / proposals
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketplace_requests(id) on delete cascade,
  provider_profile_id uuid not null references public.marketplace_provider_profiles(id) on delete cascade,
  provider_role text not null
    check (provider_role in ('sponsor', 'supplier', 'service_provider', 'consultant')),
  title text not null,
  description text,
  price_indication text,
  delivery_timeline text,
  included_services text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, provider_profile_id)
);

create index if not exists marketplace_offers_request_idx
  on public.marketplace_offers(request_id, status);
create index if not exists marketplace_offers_provider_idx
  on public.marketplace_offers(provider_profile_id, status);

drop trigger if exists update_marketplace_offers_updated_at on public.marketplace_offers;
create trigger update_marketplace_offers_updated_at
  before update on public.marketplace_offers
  for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Saved providers (club bookmarks)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_saved_providers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  provider_profile_id uuid not null references public.marketplace_provider_profiles(id) on delete cascade,
  saved_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (club_id, provider_profile_id)
);

create index if not exists marketplace_saved_providers_club_idx
  on public.marketplace_saved_providers(club_id);

-- ---------------------------------------------------------------------------
-- RLS — marketplace_provider_profiles
-- ---------------------------------------------------------------------------
alter table public.marketplace_provider_profiles enable row level security;

drop policy if exists marketplace_profiles_select on public.marketplace_provider_profiles;
create policy marketplace_profiles_select
  on public.marketplace_provider_profiles for select to authenticated
  using (
    owner_user_id = auth.uid()
    or (
      listing_status = 'active'
      and visibility in ('public', 'marketplace_only')
    )
    or public.is_platform_admin()
  );

drop policy if exists marketplace_profiles_insert_owner on public.marketplace_provider_profiles;
create policy marketplace_profiles_insert_owner
  on public.marketplace_provider_profiles for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists marketplace_profiles_update_owner on public.marketplace_provider_profiles;
create policy marketplace_profiles_update_owner
  on public.marketplace_provider_profiles for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists marketplace_profiles_moderate_platform on public.marketplace_provider_profiles;
create policy marketplace_profiles_moderate_platform
  on public.marketplace_provider_profiles for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- RLS — marketplace_requests (club-scoped)
-- ---------------------------------------------------------------------------
alter table public.marketplace_requests enable row level security;

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
      )
    )
  );

drop policy if exists marketplace_requests_manage_club_admin on public.marketplace_requests;
create policy marketplace_requests_manage_club_admin
  on public.marketplace_requests for all to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id) and created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS — marketplace_offers
-- ---------------------------------------------------------------------------
alter table public.marketplace_offers enable row level security;

drop policy if exists marketplace_offers_select on public.marketplace_offers;
create policy marketplace_offers_select
  on public.marketplace_offers for select to authenticated
  using (
    exists (
      select 1 from public.marketplace_provider_profiles p
      where p.id = marketplace_offers.provider_profile_id
        and p.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.marketplace_requests r
      where r.id = marketplace_offers.request_id
        and public.is_club_admin(auth.uid(), r.club_id)
    )
  );

drop policy if exists marketplace_offers_manage_provider on public.marketplace_offers;
create policy marketplace_offers_manage_provider
  on public.marketplace_offers for all to authenticated
  using (
    exists (
      select 1 from public.marketplace_provider_profiles p
      where p.id = marketplace_offers.provider_profile_id
        and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_provider_profiles p
      where p.id = marketplace_offers.provider_profile_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists marketplace_offers_update_club_admin on public.marketplace_offers;
create policy marketplace_offers_update_club_admin
  on public.marketplace_offers for update to authenticated
  using (
    exists (
      select 1
      from public.marketplace_requests r
      where r.id = marketplace_offers.request_id
        and public.is_club_admin(auth.uid(), r.club_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — saved providers
-- ---------------------------------------------------------------------------
alter table public.marketplace_saved_providers enable row level security;

drop policy if exists marketplace_saved_select on public.marketplace_saved_providers;
create policy marketplace_saved_select
  on public.marketplace_saved_providers for select to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists marketplace_saved_manage on public.marketplace_saved_providers;
create policy marketplace_saved_manage
  on public.marketplace_saved_providers for all to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));
