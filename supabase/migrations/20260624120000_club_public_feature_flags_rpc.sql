-- Public microsite: expose whether a public club has premium features (plan or trial).
-- Does not leak billing details — boolean only. Keep in sync with plan_entitlements.ts / plan-limits.ts.

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
  if p_club_id is null or p_feature is null or p_feature not in ('ai', 'shop') then
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

  return v_plan_id in ('squad', 'pro', 'champions', 'bespoke');
end;
$$;

revoke all on function public.club_public_has_feature(uuid, text) from public;
grant execute on function public.club_public_has_feature(uuid, text) to anon, authenticated;
