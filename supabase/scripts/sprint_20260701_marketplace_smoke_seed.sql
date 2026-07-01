-- Sprint 2026-07-01 — seed one open marketplace request for manual offer-loop smoke.
-- Run: supabase db query --linked -f supabase/scripts/sprint_20260701_marketplace_smoke_seed.sql
-- Then: club admin → /marketplace?view=requests (see request)
--       supplier persona → /partner-marketplace?view=requests → Send offer
--       club admin → /marketplace?view=offers → Accept → /partners

do $seed$
declare
  v_club_id uuid;
  v_user_id uuid;
  v_existing uuid;
begin
  select c.id into v_club_id
  from public.clubs c
  where c.slug = 'tsv-allach-09'
  limit 1;

  if v_club_id is null then
    raise exception 'Club tsv-allach-09 not found';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower('spigelai@gmail.com')
  limit 1;

  if v_user_id is null then
    select m.user_id into v_user_id
    from public.club_memberships m
    where m.club_id = v_club_id
      and m.role = 'admin'::public.app_role
      and m.status = 'active'
    order by m.created_at
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'No admin user found for smoke seed';
  end if;

  select r.id into v_existing
  from public.marketplace_requests r
  where r.club_id = v_club_id
    and r.title = 'Sprint smoke — team kit supplier'
  limit 1;

  if v_existing is not null then
    raise notice 'Smoke request already exists: %', v_existing;
    return;
  end if;

  insert into public.marketplace_requests (
    club_id,
    created_by,
    title,
    category,
    provider_type_wanted,
    description,
    visibility,
    status,
    location
  ) values (
    v_club_id,
    v_user_id,
    'Sprint smoke — team kit supplier',
    'equipment_apparel',
    'supplier',
    'Pilot request for marketplace Phase 2 smoke: jerseys and training gear for U12-I.',
    'marketplace',
    'open',
    'Munich'
  );

  raise notice 'Created open marketplace request for club %', v_club_id;
end;
$seed$;
