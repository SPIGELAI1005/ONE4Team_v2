-- Bilingual public club pages: plan feature (Pro+) + optional per-club trial.
-- Keep in sync with src/lib/plan-limits.ts (clubPageMultilingual) and club_public_has_feature.

alter table public.club_feature_trials
  drop constraint if exists club_feature_trials_feature_check;

alter table public.club_feature_trials
  add constraint club_feature_trials_feature_check
  check (feature in ('ai', 'shop', 'multilingual'));

create or replace function public.club_public_has_feature(p_club_id uuid, p_feature text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_is_public boolean;
  v_plan_id text;
  v_status text;
  v_trial_expires timestamptz;
begin
  if p_club_id is null or p_feature is null or p_feature not in ('ai', 'shop', 'multilingual') then
    return false;
  end if;

  select coalesce(c.is_public, false) into v_is_public
  from public.clubs c
  where c.id = p_club_id;

  if not v_is_public then
    return false;
  end if;

  select t.expires_at into v_trial_expires
  from public.club_feature_trials t
  where t.club_id = p_club_id
    and t.feature = p_feature;

  if v_trial_expires is not null and v_trial_expires > now() then
    return true;
  end if;

  select b.plan_id, b.status into v_plan_id, v_status
  from public.billing_subscriptions b
  where b.club_id = p_club_id;

  if v_status is null or v_status not in ('active', 'trialing') then
    return false;
  end if;

  v_plan_id := lower(coalesce(v_plan_id, 'kickoff'));

  if p_feature = 'ai' then
    return v_plan_id in ('pro', 'champions', 'bespoke');
  end if;

  if p_feature = 'multilingual' then
    return v_plan_id in ('pro', 'champions', 'bespoke');
  end if;

  return v_plan_id in ('squad', 'pro', 'champions', 'bespoke');
end;
$$;

revoke all on function public.club_public_has_feature(uuid, text) from public;
grant execute on function public.club_public_has_feature(uuid, text) to anon, authenticated;

-- Founding partner pilot: TSV Allach 09 — bilingual public club page trial (idempotent).
insert into public.club_feature_trials (club_id, feature, expires_at, note)
select c.id, 'multilingual', now() + interval '90 days', 'Founding partner bilingual club page pilot (TSV Allach 09)'
from public.clubs c
where c.name ilike '%TSV Allach%'
   or c.slug ilike '%allach%'
on conflict (club_id, feature) do update
  set expires_at = excluded.expires_at,
      note = excluded.note,
      updated_at = now();
