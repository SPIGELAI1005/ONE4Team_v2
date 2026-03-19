-- v2.4 + v2.5: multi-sport abstraction + automations

create table if not exists public.sports_catalog (
  id text primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.sports_catalog (id, name, is_active)
values
  ('football', 'Football', true),
  ('basketball', 'Basketball', true),
  ('handball', 'Handball', true),
  ('volleyball', 'Volleyball', true)
on conflict (id) do nothing;

create table if not exists public.club_sports (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sport_id text not null references public.sports_catalog(id) on delete restrict,
  is_default boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (club_id, sport_id)
);

create table if not exists public.sport_stat_templates (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sports_catalog(id) on delete cascade,
  stat_name text not null,
  stat_category text not null default 'core',
  sort_order integer not null default 0,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sport_id, stat_name)
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  rule_type text not null check (rule_type in ('attendance_reminder', 'dues_reminder', 'weekly_digest', 'renewal_reminder')),
  is_enabled boolean not null default true,
  schedule_cron text,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, rule_type)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  run_type text not null,
  run_status text not null default 'queued' check (run_status in ('queued', 'running', 'completed', 'failed')),
  result jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists club_sports_club_idx on public.club_sports(club_id);
create index if not exists automation_rules_club_idx on public.automation_rules(club_id, is_enabled);
create index if not exists automation_runs_club_idx on public.automation_runs(club_id, started_at desc);

alter table public.club_sports enable row level security;
alter table public.sport_stat_templates enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

drop policy if exists club_sports_select_member on public.club_sports;
create policy club_sports_select_member
on public.club_sports
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists club_sports_manage_admin on public.club_sports;
create policy club_sports_manage_admin
on public.club_sports
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists sport_stat_templates_read_all on public.sport_stat_templates;
create policy sport_stat_templates_read_all
on public.sport_stat_templates
for select
to authenticated
using (true);

drop policy if exists automation_rules_select_member on public.automation_rules;
create policy automation_rules_select_member
on public.automation_rules
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists automation_rules_manage_admin on public.automation_rules;
create policy automation_rules_manage_admin
on public.automation_rules
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists automation_runs_select_member on public.automation_runs;
create policy automation_runs_select_member
on public.automation_runs
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists automation_runs_manage_admin on public.automation_runs;
create policy automation_runs_manage_admin
on public.automation_runs
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create or replace function public.enqueue_automation_run(
  _club_id uuid,
  _rule_type text,
  _payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_id uuid;
  v_run_id uuid;
begin
  if not public.is_member_of_club(_club_id, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select id into v_rule_id
  from public.automation_rules
  where club_id = _club_id and rule_type = _rule_type and is_enabled = true
  limit 1;

  if v_rule_id is null then
    raise exception 'No enabled rule for type %', _rule_type;
  end if;

  insert into public.automation_runs (club_id, rule_id, run_type, result)
  values (_club_id, v_rule_id, _rule_type, _payload)
  returning id into v_run_id;

  update public.automation_rules set last_run_at = now(), updated_at = now() where id = v_rule_id;
  return v_run_id;
end;
$$;
