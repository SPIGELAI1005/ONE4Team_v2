-- Internal usage event tracking for ONE4Team Control Center analytics.
-- Events are append-only; reads go through platform-scoped aggregation RPCs.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  module_key text,
  route text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'usage_events_event_name_check') then
    alter table public.usage_events
      add constraint usage_events_event_name_check
      check (event_name in (
        'user_logged_in',
        'club_dashboard_opened',
        'public_club_page_viewed',
        'module_opened',
        'team_created',
        'event_created',
        'match_created',
        'training_created',
        'player_created',
        'invitation_sent',
        'marketplace_opened',
        'qr_code_scanned',
        'tournament_opened'
      ));
  end if;
end $$;

create index if not exists idx_usage_events_created_at
  on public.usage_events (created_at desc);

create index if not exists idx_usage_events_user_id_created_at
  on public.usage_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_usage_events_club_id_created_at
  on public.usage_events (club_id, created_at desc)
  where club_id is not null;

create index if not exists idx_usage_events_module_key_created_at
  on public.usage_events (module_key, created_at desc)
  where module_key is not null;

create index if not exists idx_usage_events_event_name_created_at
  on public.usage_events (event_name, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists usage_events_no_direct_access on public.usage_events;
create policy usage_events_no_direct_access
on public.usage_events
for all
to authenticated, anon
using (false)
with check (false);

create or replace function public.append_usage_event(
  _event_name text,
  _club_id uuid default null,
  _module_key text default null,
  _route text default null,
  _metadata_json jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text := lower(trim(_event_name));
  v_user_id uuid := auth.uid();
  v_metadata jsonb;
  v_id uuid;
  v_allowed_anonymous text[] := array['public_club_page_viewed', 'tournament_opened'];
  v_club_scoped text[] := array[
    'club_dashboard_opened',
    'module_opened',
    'team_created',
    'event_created',
    'match_created',
    'training_created',
    'player_created',
    'invitation_sent',
    'marketplace_opened',
    'tournament_opened'
  ];
begin
  if v_event is null or v_event = '' then
    raise exception 'event_name is required';
  end if;

  if v_event not in (
    'user_logged_in',
    'club_dashboard_opened',
    'public_club_page_viewed',
    'module_opened',
    'team_created',
    'event_created',
    'match_created',
    'training_created',
    'player_created',
    'invitation_sent',
    'marketplace_opened',
    'qr_code_scanned',
    'tournament_opened'
  ) then
    raise exception 'Unknown usage event: %', v_event;
  end if;

  if v_user_id is null and not (v_event = any(v_allowed_anonymous)) then
    raise exception 'Authentication required for usage event: %', v_event;
  end if;

  if v_event = 'public_club_page_viewed' then
    if _club_id is null then
      raise exception 'club_id is required for public_club_page_viewed';
    end if;
    if not exists (select 1 from public.clubs c where c.id = _club_id) then
      raise exception 'Invalid club_id for public_club_page_viewed';
    end if;
  end if;

  if v_event = 'tournament_opened' then
    if _club_id is null then
      raise exception 'club_id is required for tournament_opened';
    end if;
    if not exists (select 1 from public.clubs c where c.id = _club_id) then
      raise exception 'Invalid club_id for tournament_opened';
    end if;
  end if;

  if v_event = any(v_club_scoped) and _club_id is null then
    raise exception 'club_id is required for %', v_event;
  end if;

  if v_user_id is not null
    and _club_id is not null
    and v_event not in ('public_club_page_viewed', 'tournament_opened')
  then
    if not exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = _club_id
        and cm.user_id = v_user_id
    ) then
      raise exception 'User is not a member of club for usage event %', v_event;
    end if;
  end if;

  v_metadata := coalesce(_metadata_json, '{}'::jsonb);
  if octet_length(v_metadata::text) > 2048 then
    v_metadata := '{}'::jsonb;
  end if;

  v_metadata := v_metadata
    - 'email'
    - 'password'
    - 'token'
    - 'name'
    - 'phone'
    - 'message'
    - 'content'
    - 'description'
    - 'invite_token';

  insert into public.usage_events (club_id, user_id, event_name, module_key, route, metadata_json)
  values (
    _club_id,
    v_user_id,
    v_event,
    nullif(trim(_module_key), ''),
    nullif(trim(_route), ''),
    v_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_usage_event(text, uuid, text, text, jsonb) from public;
grant execute on function public.append_usage_event(text, uuid, text, text, jsonb) to authenticated, anon;

create or replace function public.get_active_users_last_7_days()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct ue.user_id)::integer
  from public.usage_events ue
  where (public.require_platform_permission('operator.analytics.read') ->> 'is_platform_user')::boolean
    and ue.user_id is not null
    and ue.created_at >= now() - interval '7 days';
$$;

create or replace function public.get_active_users_last_30_days()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct ue.user_id)::integer
  from public.usage_events ue
  where (public.require_platform_permission('operator.analytics.read') ->> 'is_platform_user')::boolean
    and ue.user_id is not null
    and ue.created_at >= now() - interval '30 days';
$$;

create or replace function public.get_most_used_modules(_limit integer default 10)
returns table (
  module_key text,
  event_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ue.module_key,
    count(*)::integer as event_count
  from public.usage_events ue
  where (public.require_platform_permission('operator.analytics.read') ->> 'is_platform_user')::boolean
    and ue.event_name = 'module_opened'
    and ue.module_key is not null
  group by ue.module_key
  order by count(*) desc, ue.module_key
  limit greatest(coalesce(_limit, 10), 1);
$$;

create or replace function public.get_club_usage_summary(_club_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'club_id', _club_id,
    'active_users_last_7_days', (
      select count(distinct ue.user_id)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.user_id is not null
        and ue.created_at >= now() - interval '7 days'
    ),
    'active_users_last_30_days', (
      select count(distinct ue.user_id)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.user_id is not null
        and ue.created_at >= now() - interval '30 days'
    ),
    'module_opens_last_30_days', (
      select count(*)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.event_name = 'module_opened'
        and ue.created_at >= now() - interval '30 days'
    ),
    'public_page_views_last_30_days', (
      select count(*)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.event_name = 'public_club_page_viewed'
        and ue.created_at >= now() - interval '30 days'
    ),
    'events_created', (
      select count(*)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.event_name = 'event_created'
    ),
    'matches_created', (
      select count(*)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.event_name = 'match_created'
    ),
    'teams_created', (
      select count(*)::integer
      from public.usage_events ue
      where ue.club_id = _club_id
        and ue.event_name = 'team_created'
    ),
    'last_event_at', (
      select max(ue.created_at)
      from public.usage_events ue
      where ue.club_id = _club_id
    )
  )
  from (select (public.require_platform_permission('operator.analytics.read') ->> 'is_platform_user')::boolean as ok) authorized
  where authorized.ok;
$$;

create or replace function public.get_module_usage_by_club(_limit integer default 50)
returns table (
  club_id uuid,
  club_name text,
  module_key text,
  event_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ue.club_id,
    c.name as club_name,
    ue.module_key,
    count(*)::integer as event_count
  from public.usage_events ue
  join public.clubs c on c.id = ue.club_id
  where (public.require_platform_permission('operator.analytics.read') ->> 'is_platform_user')::boolean
    and ue.event_name = 'module_opened'
    and ue.club_id is not null
    and ue.module_key is not null
    and ue.created_at >= now() - interval '30 days'
  group by ue.club_id, c.name, ue.module_key
  order by count(*) desc, c.name, ue.module_key
  limit greatest(coalesce(_limit, 50), 1);
$$;

create or replace function public.get_recently_active_clubs(_limit integer default 10)
returns table (
  club_id uuid,
  club_name text,
  club_slug text,
  last_activity_at timestamptz,
  event_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ue.club_id,
    c.name as club_name,
    c.slug as club_slug,
    max(ue.created_at) as last_activity_at,
    count(*)::integer as event_count
  from public.usage_events ue
  join public.clubs c on c.id = ue.club_id
  where (public.require_platform_permission('operator.analytics.read') ->> 'is_platform_user')::boolean
    and ue.club_id is not null
    and ue.created_at >= now() - interval '30 days'
  group by ue.club_id, c.name, c.slug
  order by max(ue.created_at) desc
  limit greatest(coalesce(_limit, 10), 1);
$$;

revoke all on function public.get_active_users_last_7_days() from public;
revoke all on function public.get_active_users_last_30_days() from public;
revoke all on function public.get_most_used_modules(integer) from public;
revoke all on function public.get_club_usage_summary(uuid) from public;
revoke all on function public.get_module_usage_by_club(integer) from public;
revoke all on function public.get_recently_active_clubs(integer) from public;

grant execute on function public.get_active_users_last_7_days() to authenticated;
grant execute on function public.get_active_users_last_30_days() to authenticated;
grant execute on function public.get_most_used_modules(integer) to authenticated;
grant execute on function public.get_club_usage_summary(uuid) to authenticated;
grant execute on function public.get_module_usage_by_club(integer) to authenticated;
grant execute on function public.get_recently_active_clubs(integer) to authenticated;
