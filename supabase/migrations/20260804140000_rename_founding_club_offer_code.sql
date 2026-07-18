-- Rename Founding Club public offer code (idempotent).
-- New public code: ONE4Team-Founding-Club-12M

update public.commercial_offers
set
  code = 'ONE4Team-Founding-Club-12M',
  updated_at = now()
where code = 'founding-club-12-months-free';

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

-- Normalize legacy offer codes when redeeming
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
  v_code text := trim(_offer_code);
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if _club_id is null or v_code is null or length(v_code) = 0 then
    raise exception 'invalid_input';
  end if;
  if not public.is_club_admin(v_uid, _club_id) then
    raise exception 'not_club_admin';
  end if;

  -- Legacy public code alias
  if v_code = 'founding-club-12-months-free' then
    v_code := 'ONE4Team-Founding-Club-12M';
  end if;

  select * into v_offer
  from public.commercial_offers
  where code = v_code
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
