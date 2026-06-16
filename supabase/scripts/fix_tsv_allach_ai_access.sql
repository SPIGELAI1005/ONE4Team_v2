-- One-shot fix: enable AI4Team for TSV Allach 09 (run in Supabase SQL Editor).
-- Safe to re-run (idempotent).

-- 1) Show matching club(s)
select id, name, slug from public.clubs
where name ilike '%allach%' or slug ilike '%allach%';

-- 2) Feature trial (AI only) — requires migration 20260614140000_club_feature_trials.sql
insert into public.club_feature_trials (club_id, feature, expires_at, note)
select c.id, 'ai', now() + interval '90 days', 'Founding partner AI4Team pilot (TSV Allach 09)'
from public.clubs c
where c.name ilike '%allach%' or c.slug ilike '%allach%'
on conflict (club_id, feature) do update
  set expires_at = excluded.expires_at,
      note = excluded.note,
      updated_at = now();

-- 3) Billing row (Pro trialing) — fixes Edge even before trial-aware deploy
insert into public.billing_subscriptions (club_id, plan_id, billing_cycle, status, created_by)
select
  c.id,
  'pro',
  'monthly',
  'trialing',
  coalesce(
    (select cm.user_id from public.club_memberships cm where cm.club_id = c.id order by cm.created_at nulls last limit 1),
    (select id from auth.users order by created_at limit 1)
  )
from public.clubs c
where c.name ilike '%allach%' or c.slug ilike '%allach%'
on conflict (club_id) do update
  set plan_id = 'pro',
      status = 'trialing',
      updated_at = now();

-- 4) Verify
select c.name, c.slug, b.plan_id, b.status, t.feature, t.expires_at
from public.clubs c
left join public.billing_subscriptions b on b.club_id = c.id
left join public.club_feature_trials t on t.club_id = c.id and t.feature = 'ai'
where c.name ilike '%allach%' or c.slug ilike '%allach%';
