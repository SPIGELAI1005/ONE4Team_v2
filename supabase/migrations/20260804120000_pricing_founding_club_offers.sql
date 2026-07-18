-- 2026-07-18: Commercial ladder sync + Founding Club offer model
-- Aligns public.plans with src/lib/plan-catalog.ts; does not wipe entitlements/subscriptions.

-- ---------------------------------------------------------------------------
-- 1) Extend plans columns (idempotent)
-- ---------------------------------------------------------------------------
alter table public.plans
  add column if not exists max_storage_mb integer,
  add column if not exists max_admins integer,
  add column if not exists max_trainers integer;

update public.plans set
  description = 'Essential club management for your first digital season (up to 500 member profiles).',
  price_monthly = 19.00,
  price_yearly = 182.40,
  max_users = 500,
  max_teams = 10,
  max_storage_mb = 1024,
  max_admins = 3,
  max_trainers = 10,
  updated_at = now()
where key = 'kickoff';

update public.plans set
  description = 'Everyday club operations with communication, tasks, dues, documents and commerce (up to 1,000 member profiles).',
  price_monthly = 39.00,
  price_yearly = 374.40,
  max_users = 1000,
  max_teams = 30,
  max_storage_mb = 10240,
  max_admins = 5,
  max_trainers = 50,
  updated_at = now()
where key = 'squad';

update public.plans set
  description = 'Manage, analyse and develop your club with AI 4 T, advanced reporting and custom branding (up to 2,000 member profiles).',
  price_monthly = 79.00,
  price_yearly = 758.40,
  max_users = 2000,
  max_teams = 100,
  max_storage_mb = 51200,
  max_admins = 10,
  max_trainers = 200,
  updated_at = now()
where key = 'pro';

update public.plans set
  description = 'Large multi-team organisations needing scale, integrations and premium support (up to 5,000 member profiles).',
  price_monthly = 149.00,
  price_yearly = 1430.40,
  max_users = 5000,
  max_teams = 250,
  max_storage_mb = 153600,
  max_admins = 25,
  max_trainers = null,
  updated_at = now()
where key = 'champions';

-- Ensure kickoff plan_modules include core ops modules when present
insert into public.plan_modules (plan_id, module_id, included, limits_json)
select p.id, m.id, true, '{}'::jsonb
from public.plans p
cross join public.modules m
where p.key = 'kickoff'
  and m.key in (
    'members', 'teams', 'matches', 'events', 'trainings', 'communication',
    'tasks', 'documents', 'payments', 'partners', 'marketplace', 'shop', 'club_page', 'analytics'
  )
on conflict (plan_id, module_id) do update
set included = excluded.included, updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) billing_subscriptions: access_source + promotional/grace statuses
-- ---------------------------------------------------------------------------
alter table public.billing_subscriptions
  add column if not exists access_source text;

update public.billing_subscriptions
set access_source = coalesce(access_source, case
  when status = 'trialing' then 'standard_trial'
  when stripe_subscription_id is not null then 'stripe'
  else 'legacy'
end)
where access_source is null;

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_access_source_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_access_source_check
  check (
    access_source is null
    or access_source in (
      'stripe',
      'standard_trial',
      'commercial_offer',
      'operator_grant',
      'legacy'
    )
  );

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_status_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_status_check
  check (
    status in (
      'trialing',
      'active',
      'past_due',
      'cancelled',
      'paused',
      'canceled',
      'incomplete',
      'promotional',
      'grace',
      'expired'
    )
  );

-- Grandfather existing kickoff / trialing clubs
update public.billing_subscriptions
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'grandfather_kickoff', true,
  'grandfathered_at', now()
)
where plan_id = 'kickoff'
  and status in ('active', 'trialing', 'past_due')
  and coalesce(metadata->>'grandfather_kickoff', '') <> 'true'
  and coalesce(access_source, '') <> 'commercial_offer';

-- ---------------------------------------------------------------------------
-- 3) Sponsor campaigns (scaffold)
-- ---------------------------------------------------------------------------
create table if not exists public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  campaign_name text not null,
  logo_url text,
  public_attribution text,
  max_sponsored_clubs integer,
  available_from timestamptz,
  available_until timestamptz,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sponsor_campaigns enable row level security;

drop policy if exists sponsor_campaigns_select_platform on public.sponsor_campaigns;
create policy sponsor_campaigns_select_platform
on public.sponsor_campaigns for select to authenticated
using (public.can_view_platform());

drop policy if exists sponsor_campaigns_manage_platform on public.sponsor_campaigns;
create policy sponsor_campaigns_manage_platform
on public.sponsor_campaigns for all to authenticated
using ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean);

-- ---------------------------------------------------------------------------
-- 4) Commercial offers + redemptions
-- ---------------------------------------------------------------------------
create table if not exists public.commercial_offers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_de text not null,
  plan_id text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'closed')),
  duration_months integer not null default 12,
  promotional_price numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  max_redemptions integer,
  available_from timestamptz,
  available_until timestamptz,
  new_clubs_only boolean not null default true,
  no_payment_method_required boolean not null default true,
  grace_period_days integer not null default 30,
  sponsor_campaign_id uuid references public.sponsor_campaigns(id) on delete set null,
  terms_version text not null default '2026-07-18',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.commercial_offers(id) on delete restrict,
  club_id uuid not null references public.clubs(id) on delete cascade,
  status text not null default 'active'
    check (status in (
      'reserved', 'active', 'expiring', 'grace', 'expired', 'converted', 'cancelled'
    )),
  redeemed_at timestamptz not null default now(),
  activated_at timestamptz,
  expires_at timestamptz,
  grace_ends_at timestamptz,
  converted_at timestamptz,
  converted_plan_id text,
  sponsor_campaign_id uuid references public.sponsor_campaigns(id) on delete set null,
  source text,
  terms_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, club_id)
);

create index if not exists idx_club_offer_redemptions_club
  on public.club_offer_redemptions (club_id, status);

create index if not exists idx_club_offer_redemptions_expires
  on public.club_offer_redemptions (expires_at)
  where status in ('active', 'expiring', 'grace');

alter table public.commercial_offers enable row level security;
alter table public.club_offer_redemptions enable row level security;

-- Public read of active offer marketing fields (authenticated)
drop policy if exists commercial_offers_select_authenticated on public.commercial_offers;
create policy commercial_offers_select_authenticated
on public.commercial_offers for select to authenticated
using (status = 'active' or public.can_view_platform());

drop policy if exists commercial_offers_manage_platform on public.commercial_offers;
create policy commercial_offers_manage_platform
on public.commercial_offers for all to authenticated
using ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean);

-- Club members can read their own redemptions; no direct insert/update
drop policy if exists club_offer_redemptions_select_member on public.club_offer_redemptions;
create policy club_offer_redemptions_select_member
on public.club_offer_redemptions for select to authenticated
using (
  public.is_member_of_club(auth.uid(), club_id)
  or public.can_view_platform()
);

drop policy if exists club_offer_redemptions_manage_platform on public.club_offer_redemptions;
create policy club_offer_redemptions_manage_platform
on public.club_offer_redemptions for all to authenticated
using ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean);

insert into public.commercial_offers (
  code, name_en, name_de, plan_id, status, duration_months, promotional_price,
  max_redemptions, new_clubs_only, no_payment_method_required, grace_period_days, terms_version
)
values (
  'ONE4Team-Founding-Club-12M',
  'Founding Club – First Season Free',
  'Gründungsverein – Erste Saison kostenlos',
  'kickoff',
  'active',
  12,
  0,
  100,
  true,
  true,
  30,
  '2026-07-18'
)
on conflict (code) do update set
  name_en = excluded.name_en,
  name_de = excluded.name_de,
  status = excluded.status,
  duration_months = excluded.duration_months,
  max_redemptions = excluded.max_redemptions,
  terms_version = excluded.terms_version,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5) Secure redeem_commercial_offer RPC
-- ---------------------------------------------------------------------------
create or replace function public.redeem_commercial_offer(
  _club_id uuid,
  _offer_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.commercial_offers%rowtype;
  v_redemption public.club_offer_redemptions%rowtype;
  v_now timestamptz := now();
  v_active_count integer;
  v_has_paid boolean;
  v_expires timestamptz;
  v_grace timestamptz;
  v_plan public.plans%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if _club_id is null or _offer_code is null or length(trim(_offer_code)) = 0 then
    raise exception 'invalid_input';
  end if;
  if not public.is_club_admin(v_uid, _club_id) then
    raise exception 'not_club_admin';
  end if;

  select * into v_offer
  from public.commercial_offers
  where code = trim(_offer_code)
  for update;

  if not found then
    raise exception 'offer_not_found';
  end if;
  if v_offer.status <> 'active' then
    raise exception 'offer_not_active';
  end if;
  if v_offer.available_from is not null and v_now < v_offer.available_from then
    raise exception 'offer_not_yet_available';
  end if;
  if v_offer.available_until is not null and v_now > v_offer.available_until then
    raise exception 'offer_expired_window';
  end if;

  if exists (
    select 1 from public.club_offer_redemptions r
    where r.offer_id = v_offer.id and r.club_id = _club_id
  ) then
    raise exception 'offer_already_redeemed';
  end if;

  if exists (
    select 1 from public.club_offer_redemptions r
    where r.club_id = _club_id
      and r.status in ('reserved', 'active', 'expiring', 'grace')
  ) then
    raise exception 'club_has_active_offer';
  end if;

  select exists (
    select 1 from public.billing_subscriptions bs
    where bs.club_id = _club_id
      and bs.status in ('active', 'past_due')
      and coalesce(bs.access_source, 'stripe') = 'stripe'
      and bs.stripe_subscription_id is not null
  ) into v_has_paid;

  if v_has_paid then
    raise exception 'club_has_paid_subscription';
  end if;

  if v_offer.max_redemptions is not null then
    select count(*) into v_active_count
    from public.club_offer_redemptions r
    where r.offer_id = v_offer.id
      and r.status in ('reserved', 'active', 'expiring', 'grace', 'converted');
    if v_active_count >= v_offer.max_redemptions then
      raise exception 'offer_cap_reached';
    end if;
  end if;

  v_expires := v_now + make_interval(months => v_offer.duration_months);
  v_grace := v_expires + make_interval(days => v_offer.grace_period_days);

  insert into public.club_offer_redemptions (
    offer_id, club_id, status, redeemed_at, activated_at, expires_at, grace_ends_at,
    sponsor_campaign_id, source, terms_version, created_by
  ) values (
    v_offer.id, _club_id, 'active', v_now, v_now, v_expires, v_grace,
    v_offer.sponsor_campaign_id, 'redeem_rpc', v_offer.terms_version, v_uid
  )
  returning * into v_redemption;

  insert into public.billing_subscriptions (
    club_id, plan_id, billing_cycle, status, access_source, metadata, created_by
  ) values (
    _club_id,
    v_offer.plan_id,
    'monthly',
    'promotional',
    'commercial_offer',
    jsonb_build_object(
      'offer_code', v_offer.code,
      'redemption_id', v_redemption.id,
      'expires_at', v_expires,
      'grace_ends_at', v_grace,
      'terms_version', v_offer.terms_version
    ),
    v_uid
  )
  on conflict (club_id) do update set
    plan_id = excluded.plan_id,
    status = 'promotional',
    access_source = 'commercial_offer',
    metadata = coalesce(public.billing_subscriptions.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now();

  select * into v_plan from public.plans where key = v_offer.plan_id;

  return jsonb_build_object(
    'offerCode', v_offer.code,
    'status', 'active',
    'effectivePlan', v_offer.plan_id,
    'activatedAt', v_now,
    'expiresAt', v_expires,
    'graceEndsAt', v_grace,
    'memberLimit', coalesce(v_plan.max_users, 500),
    'teamLimit', coalesce(v_plan.max_teams, 10),
    'storageLimitMb', coalesce(v_plan.max_storage_mb, 1024),
    'administratorLimit', coalesce(v_plan.max_admins, 3)
  );
end;
$$;

revoke all on function public.redeem_commercial_offer(uuid, text) from public;
grant execute on function public.redeem_commercial_offer(uuid, text) to authenticated;

-- Process offer expiry / grace (called by Edge cron)
create or replace function public.process_commercial_offer_expiry()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_to_grace integer := 0;
  v_to_expired integer := 0;
begin
  update public.club_offer_redemptions r
  set status = 'grace', updated_at = v_now
  where r.status in ('active', 'expiring')
    and r.expires_at is not null
    and r.expires_at <= v_now
    and (r.grace_ends_at is null or r.grace_ends_at > v_now);

  get diagnostics v_to_grace = row_count;

  update public.billing_subscriptions bs
  set status = 'grace', updated_at = v_now
  where bs.access_source = 'commercial_offer'
    and bs.status = 'promotional'
    and exists (
      select 1 from public.club_offer_redemptions r
      where r.club_id = bs.club_id and r.status = 'grace'
    );

  update public.club_offer_redemptions r
  set status = 'expired', updated_at = v_now
  where r.status = 'grace'
    and r.grace_ends_at is not null
    and r.grace_ends_at <= v_now;

  get diagnostics v_to_expired = row_count;

  update public.billing_subscriptions bs
  set status = 'expired', updated_at = v_now
  where bs.access_source = 'commercial_offer'
    and bs.status = 'grace'
    and exists (
      select 1 from public.club_offer_redemptions r
      where r.club_id = bs.club_id and r.status = 'expired'
    );

  return jsonb_build_object(
    'movedToGrace', v_to_grace,
    'movedToExpired', v_to_expired,
    'processedAt', v_now
  );
end;
$$;

revoke all on function public.process_commercial_offer_expiry() from public;
grant execute on function public.process_commercial_offer_expiry() to service_role;
