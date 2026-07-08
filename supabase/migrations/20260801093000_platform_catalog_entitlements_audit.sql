-- ONE4Team Control Center catalog, entitlements, and audit foundation.
-- Existing models reused:
-- - `billing_subscriptions.plan_id` already stores the active purchased plan key per club.
-- - `club_feature_trials` already stores narrow AI/shop trials.
-- - `platform_admin_audit_events` already stores platform audit history, so it is extended
--   instead of replaced. The `audit_logs` view below provides the canonical shape.

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  category text not null default 'core',
  is_core boolean not null default false,
  is_billable boolean not null default false,
  default_enabled boolean not null default false,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'modules_status_check') then
    alter table public.modules
      add constraint modules_status_check
      check (status in ('ACTIVE', 'INACTIVE', 'DEPRECATED'));
  end if;
end $$;

create index if not exists idx_modules_category_status
  on public.modules (category, status);

alter table public.modules enable row level security;

drop policy if exists modules_select_platform on public.modules;
create policy modules_select_platform
on public.modules
for select
to authenticated
using (public.can_view_platform());

drop policy if exists modules_manage_platform on public.modules;
create policy modules_manage_platform
on public.modules
for all
to authenticated
using ((public.require_platform_permission('operator.modules.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.modules.manage') ->> 'is_platform_user')::boolean);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  max_users integer,
  max_teams integer,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plans_status_check') then
    alter table public.plans
      add constraint plans_status_check
      check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
  end if;
end $$;

create index if not exists idx_plans_status
  on public.plans (status);

alter table public.plans enable row level security;

drop policy if exists plans_select_platform on public.plans;
create policy plans_select_platform
on public.plans
for select
to authenticated
using (public.can_view_platform());

drop policy if exists plans_manage_platform on public.plans;
create policy plans_manage_platform
on public.plans
for all
to authenticated
using ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean);

create table if not exists public.plan_modules (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  included boolean not null default true,
  limits_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, module_id)
);

alter table public.plan_modules enable row level security;

drop policy if exists plan_modules_select_platform on public.plan_modules;
create policy plan_modules_select_platform
on public.plan_modules
for select
to authenticated
using (public.can_view_platform());

drop policy if exists plan_modules_manage_platform on public.plan_modules;
create policy plan_modules_manage_platform
on public.plan_modules
for all
to authenticated
using ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean);

create table if not exists public.club_module_entitlements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  enabled boolean not null default true,
  source text not null default 'SYSTEM',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, module_id, source)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'club_module_entitlements_source_check') then
    alter table public.club_module_entitlements
      add constraint club_module_entitlements_source_check
      check (source in ('PLAN', 'MANUAL_OVERRIDE', 'TRIAL', 'PROMOTION', 'SUPPORT', 'SYSTEM'));
  end if;
end $$;

create index if not exists idx_club_module_entitlements_club
  on public.club_module_entitlements (club_id, enabled);

create index if not exists idx_club_module_entitlements_module
  on public.club_module_entitlements (module_id, enabled);

alter table public.club_module_entitlements enable row level security;

drop policy if exists club_module_entitlements_select_platform on public.club_module_entitlements;
create policy club_module_entitlements_select_platform
on public.club_module_entitlements
for select
to authenticated
using (public.can_view_platform());

drop policy if exists club_module_entitlements_manage_platform on public.club_module_entitlements;
create policy club_module_entitlements_manage_platform
on public.club_module_entitlements
for all
to authenticated
using ((public.require_platform_permission('operator.modules.manage') ->> 'is_platform_user')::boolean)
with check ((public.require_platform_permission('operator.modules.manage') ->> 'is_platform_user')::boolean);

alter table public.clubs
  add column if not exists status text not null default 'ACTIVE';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_status_check') then
    alter table public.clubs
      add constraint clubs_status_check
      check (status in ('ACTIVE', 'DISABLED', 'SUSPENDED', 'ARCHIVED'));
  end if;
end $$;

create index if not exists idx_clubs_status
  on public.clubs (status);

alter table public.platform_admin_audit_events
  add column if not exists actor_email text,
  add column if not exists actor_role text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists club_id uuid references public.clubs(id) on delete set null,
  add column if not exists before_json jsonb,
  add column if not exists after_json jsonb,
  add column if not exists reason text,
  add column if not exists ip_address inet,
  add column if not exists user_agent text;

comment on column public.platform_admin_audit_events.action is
  'Platform audit action. Expected sensitive actions include MODULE_ENABLED, MODULE_DISABLED, PLAN_CHANGED, CLUB_STATUS_CHANGED, PLATFORM_USER_CREATED, PLATFORM_USER_DISABLED, SUPPORT_NOTE_CREATED, IMPERSONATION_STARTED, and IMPERSONATION_ENDED. Historical free-form actions remain valid.';

create index if not exists idx_platform_admin_audit_entity
  on public.platform_admin_audit_events (entity_type, entity_id, created_at desc);

create index if not exists idx_platform_admin_audit_club
  on public.platform_admin_audit_events (club_id, created_at desc);

create or replace view public.audit_logs as
select
  id,
  actor_user_id,
  actor_email,
  actor_role,
  action,
  entity_type,
  entity_id,
  club_id,
  before_json,
  after_json,
  reason,
  ip_address,
  user_agent,
  created_at
from public.platform_admin_audit_events;

create or replace function public.append_audit_log(
  _action text,
  _entity_type text,
  _entity_id text default null,
  _club_id uuid default null,
  _before_json jsonb default null,
  _after_json jsonb default null,
  _reason text default null,
  _ip_address inet default null,
  _user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  inserted_id uuid;
begin
  current_platform_user := public.require_platform_access();

  insert into public.platform_admin_audit_events (
    actor_user_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    club_id,
    payload,
    before_json,
    after_json,
    reason,
    ip_address,
    user_agent
  )
  values (
    auth.uid(),
    current_platform_user ->> 'email',
    current_platform_user ->> 'role',
    _action,
    _entity_type,
    _entity_id,
    _club_id,
    jsonb_build_object('entity_type', _entity_type, 'entity_id', _entity_id, 'reason', _reason),
    _before_json,
    _after_json,
    _reason,
    _ip_address,
    _user_agent
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.log_platform_admin_action(_action text, _payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_view_platform() then
    return;
  end if;

  perform public.append_audit_log(
    _action,
    coalesce(_payload ->> 'entity_type', 'platform'),
    _payload ->> 'entity_id',
    nullif(_payload ->> 'club_id', '')::uuid,
    _payload -> 'before',
    _payload -> 'after',
    _payload ->> 'reason',
    null,
    null
  );
end;
$$;

create or replace function public.audit_club_module_entitlement_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_audit_log(
      case when new.enabled then 'MODULE_ENABLED' else 'MODULE_DISABLED' end,
      'club_module_entitlement',
      new.id::text,
      new.club_id,
      null,
      to_jsonb(new),
      new.reason
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.enabled is distinct from new.enabled then
    perform public.append_audit_log(
      case when new.enabled then 'MODULE_ENABLED' else 'MODULE_DISABLED' end,
      'club_module_entitlement',
      new.id::text,
      new.club_id,
      to_jsonb(old),
      to_jsonb(new),
      new.reason
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_club_module_entitlements_change on public.club_module_entitlements;
create trigger audit_club_module_entitlements_change
after insert or update of enabled
on public.club_module_entitlements
for each row execute function public.audit_club_module_entitlement_change();

create or replace function public.audit_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_audit_log('PLAN_CHANGED', tg_table_name, new.id::text, null, null, to_jsonb(new), null);
    return new;
  end if;

  perform public.append_audit_log('PLAN_CHANGED', tg_table_name, new.id::text, null, to_jsonb(old), to_jsonb(new), null);
  return new;
end;
$$;

drop trigger if exists audit_plans_change on public.plans;
create trigger audit_plans_change
after insert or update
on public.plans
for each row execute function public.audit_plan_change();

drop trigger if exists audit_plan_modules_change on public.plan_modules;
create trigger audit_plan_modules_change
after insert or update
on public.plan_modules
for each row execute function public.audit_plan_change();

create or replace function public.audit_club_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.status is distinct from new.status then
    perform public.append_audit_log(
      'CLUB_STATUS_CHANGED',
      'club',
      new.id::text,
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_clubs_status_change on public.clubs;
create trigger audit_clubs_status_change
after update of status
on public.clubs
for each row execute function public.audit_club_status_change();

create or replace function public.audit_platform_user_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_audit_log(
      'PLATFORM_USER_CREATED',
      'platform_user',
      new.id::text,
      null,
      null,
      to_jsonb(new) - 'auth_user_id',
      null
    );
    return new;
  end if;

  if old.status is distinct from new.status and new.status = 'DISABLED' then
    perform public.append_audit_log(
      'PLATFORM_USER_DISABLED',
      'platform_user',
      new.id::text,
      null,
      to_jsonb(old) - 'auth_user_id',
      to_jsonb(new) - 'auth_user_id',
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_platform_users_change on public.platform_users;
create trigger audit_platform_users_change
after insert or update of status
on public.platform_users
for each row execute function public.audit_platform_user_change();

drop trigger if exists update_modules_updated_at on public.modules;
create trigger update_modules_updated_at
before update on public.modules
for each row execute function public.update_updated_at();

drop trigger if exists update_plans_updated_at on public.plans;
create trigger update_plans_updated_at
before update on public.plans
for each row execute function public.update_updated_at();

drop trigger if exists update_plan_modules_updated_at on public.plan_modules;
create trigger update_plan_modules_updated_at
before update on public.plan_modules
for each row execute function public.update_updated_at();

drop trigger if exists update_club_module_entitlements_updated_at on public.club_module_entitlements;
create trigger update_club_module_entitlements_updated_at
before update on public.club_module_entitlements
for each row execute function public.update_updated_at();

insert into public.modules (key, name, description, category, is_core, is_billable, default_enabled, status)
values
  ('public_club_page', 'Public Club Page', 'Public microsite for club presence, news, schedules, and documents.', 'public_site', true, false, true, 'ACTIVE'),
  ('team_management', 'Team Management', 'Teams, squads, roles, and member-to-team organization.', 'operations', true, false, true, 'ACTIVE'),
  ('training_calendar', 'Training Calendar', 'Training planning, activities, attendance, and schedules.', 'sports', true, false, true, 'ACTIVE'),
  ('match_management', 'Match Management', 'Fixtures, live scores, match details, and matchday workflows.', 'sports', true, false, true, 'ACTIVE'),
  ('player_profiles', 'Player Profiles', 'Player details, development context, and profile pages.', 'members', true, false, true, 'ACTIVE'),
  ('documents', 'Documents', 'Club document storage and public document publishing.', 'content', true, false, true, 'ACTIVE'),
  ('marketplace', 'Marketplace', 'Partner and supplier marketplace discovery.', 'commerce', false, true, false, 'ACTIVE'),
  ('partner_management', 'Partner Management', 'Sponsors, suppliers, service providers, and collaboration workflows.', 'commerce', false, true, false, 'ACTIVE'),
  ('payments', 'Payments', 'Dues, billing, payment tracking, and financial workflows.', 'finance', false, true, false, 'ACTIVE'),
  ('communication', 'Communication', 'Announcements, messaging, and notification workflows.', 'communication', true, false, true, 'ACTIVE'),
  ('statistics', 'Statistics', 'Reports, player statistics, and club analytics.', 'analytics', false, true, false, 'ACTIVE'),
  ('tournament_module', 'Tournament Module', 'Tournament pages, schedules, and live competition views.', 'events', false, true, false, 'ACTIVE'),
  ('qr_code_module', 'QR Code Module', 'QR workflows for public pages, attendance, and event access.', 'automation', false, true, false, 'ACTIVE'),
  ('ai_assistant', 'AI Assistant', 'AI 4 T assistant workflows and automation support.', 'ai', false, true, false, 'ACTIVE')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    is_core = excluded.is_core,
    is_billable = excluded.is_billable,
    default_enabled = excluded.default_enabled,
    status = excluded.status,
    updated_at = now();

insert into public.plans (key, name, description, price_monthly, price_yearly, max_users, max_teams, status)
values
  ('kickoff', 'Kickoff', 'Entry plan for small clubs getting started with ONE4Team.', 1.40, 14.00, 50, 3, 'ACTIVE'),
  ('squad', 'Squad', 'Growth plan for clubs that need payments, partners, and shop workflows.', 2.80, 28.00, 200, 10, 'ACTIVE'),
  ('pro', 'Pro', 'Advanced plan with AI, analytics, branding, and multilingual public pages.', 5.60, 56.00, 1000, 50, 'ACTIVE'),
  ('champions', 'Champions', 'Large-club plan with broad limits, API readiness, and priority support.', 11.20, 112.00, 5000, 200, 'ACTIVE'),
  ('bespoke', 'Bespoke', 'Custom enterprise-style plan for special commercial arrangements.', 0.00, 0.00, null, null, 'ACTIVE')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    price_monthly = excluded.price_monthly,
    price_yearly = excluded.price_yearly,
    max_users = excluded.max_users,
    max_teams = excluded.max_teams,
    status = excluded.status,
    updated_at = now();

insert into public.plan_modules (plan_id, module_id, included, limits_json)
select p.id, m.id, true, '{}'::jsonb
from public.plans p
join public.modules m on
  (
    p.key = 'kickoff'
    and m.key in ('public_club_page', 'team_management', 'training_calendar', 'match_management', 'player_profiles', 'documents', 'communication')
  )
  or (
    p.key = 'squad'
    and m.key in ('public_club_page', 'team_management', 'training_calendar', 'match_management', 'player_profiles', 'documents', 'communication', 'marketplace', 'partner_management', 'payments')
  )
  or (
    p.key = 'pro'
    and m.key in ('public_club_page', 'team_management', 'training_calendar', 'match_management', 'player_profiles', 'documents', 'communication', 'marketplace', 'partner_management', 'payments', 'statistics', 'ai_assistant')
  )
  or (
    p.key = 'champions'
    and m.key in ('public_club_page', 'team_management', 'training_calendar', 'match_management', 'player_profiles', 'documents', 'communication', 'marketplace', 'partner_management', 'payments', 'statistics', 'tournament_module', 'qr_code_module', 'ai_assistant')
  )
  or (
    p.key = 'bespoke'
  )
on conflict (plan_id, module_id) do update
set included = excluded.included,
    limits_json = excluded.limits_json,
    updated_at = now();

create or replace function public.get_platform_modules()
returns setof public.modules
language sql
stable
security definer
set search_path = public
as $$
  select * from public.modules
  where (public.require_platform_permission('operator.modules.read') ->> 'is_platform_user')::boolean
  order by category, name;
$$;

create or replace function public.get_platform_plans()
returns table (
  id uuid,
  key text,
  name text,
  description text,
  price_monthly numeric,
  price_yearly numeric,
  max_users integer,
  max_teams integer,
  status text,
  modules jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.key,
    p.name,
    p.description,
    p.price_monthly,
    p.price_yearly,
    p.max_users,
    p.max_teams,
    p.status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'key', m.key,
          'name', m.name,
          'included', pm.included,
          'limits_json', pm.limits_json
        )
        order by m.category, m.name
      ) filter (where m.id is not null),
      '[]'::jsonb
    ) as modules,
    p.created_at,
    p.updated_at
  from public.plans p
  left join public.plan_modules pm on pm.plan_id = p.id
  left join public.modules m on m.id = pm.module_id
  where (public.require_platform_permission('operator.plans.read') ->> 'is_platform_user')::boolean
  group by p.id
  order by p.price_yearly nulls last, p.name;
$$;

create or replace function public.get_club_module_entitlements(_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  module_id uuid,
  module_key text,
  module_name text,
  enabled boolean,
  source text,
  valid_from timestamptz,
  valid_until timestamptz,
  reason text,
  changed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cme.id,
    cme.club_id,
    cme.module_id,
    m.key as module_key,
    m.name as module_name,
    cme.enabled,
    cme.source,
    cme.valid_from,
    cme.valid_until,
    cme.reason,
    cme.changed_by,
    cme.created_at,
    cme.updated_at
  from public.club_module_entitlements cme
  join public.modules m on m.id = cme.module_id
  where cme.club_id = _club_id
    and (public.require_platform_permission('operator.modules.read') ->> 'is_platform_user')::boolean
  order by m.category, m.name, cme.source;
$$;

create or replace function public.get_platform_audit_logs(_limit integer default 100)
returns table (
  id uuid,
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  action text,
  entity_type text,
  entity_id text,
  club_id uuid,
  before_json jsonb,
  after_json jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    al.id,
    al.actor_user_id,
    al.actor_email,
    al.actor_role,
    al.action,
    al.entity_type,
    al.entity_id,
    al.club_id,
    al.before_json,
    al.after_json,
    al.reason,
    al.ip_address,
    al.user_agent,
    al.created_at
  from public.audit_logs al
  where (public.require_platform_permission('operator.audit.read') ->> 'is_platform_user')::boolean
  order by al.created_at desc
  limit greatest(1, least(coalesce(_limit, 100), 500));
$$;

revoke all on function public.append_audit_log(text, text, text, uuid, jsonb, jsonb, text, inet, text) from public;
revoke all on function public.get_platform_modules() from public;
revoke all on function public.get_platform_plans() from public;
revoke all on function public.get_club_module_entitlements(uuid) from public;
revoke all on function public.get_platform_audit_logs(integer) from public;

grant execute on function public.append_audit_log(text, text, text, uuid, jsonb, jsonb, text, inet, text) to authenticated;
grant execute on function public.get_platform_modules() to authenticated;
grant execute on function public.get_platform_plans() to authenticated;
grant execute on function public.get_club_module_entitlements(uuid) to authenticated;
grant execute on function public.get_platform_audit_logs(integer) to authenticated;
