-- Per-club feature trials (e.g. AI 4 T pilot) without upgrading the full subscription plan.
-- Checked by Edge `clubHasPlanFeature` and client `usePlanGuard`.

create table if not exists public.club_feature_trials (
  club_id uuid not null references public.clubs(id) on delete cascade,
  feature text not null check (feature in ('ai', 'shop')),
  expires_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id, feature)
);

create index if not exists idx_club_feature_trials_expires
  on public.club_feature_trials (expires_at);

alter table public.club_feature_trials enable row level security;

drop policy if exists club_feature_trials_select_member on public.club_feature_trials;
create policy club_feature_trials_select_member
on public.club_feature_trials
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_feature_trials_manage_platform_admin on public.club_feature_trials;
create policy club_feature_trials_manage_platform_admin
on public.club_feature_trials
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop trigger if exists update_club_feature_trials_updated_at on public.club_feature_trials;
create trigger update_club_feature_trials_updated_at
before update on public.club_feature_trials
for each row execute function public.update_updated_at();

-- Founding partner: TSV Allach 09 — 90-day AI 4 T pilot (idempotent).
insert into public.club_feature_trials (club_id, feature, expires_at, note)
select c.id, 'ai', now() + interval '90 days', 'Founding partner AI 4 T pilot (TSV Allach 09)'
from public.clubs c
where c.name ilike '%TSV Allach%'
   or c.slug ilike '%allach%'
on conflict (club_id, feature) do update
  set expires_at = excluded.expires_at,
      note = excluded.note,
      updated_at = now();
