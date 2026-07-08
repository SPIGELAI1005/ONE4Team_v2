-- Platform-wide usage analytics for the ONE4Team Control Center.
-- Aggregates usage_events with optional filters; no direct PII in recent event rows.

create or replace function public.get_operator_usage_analytics(
  _date_from timestamptz default null,
  _date_to timestamptz default null,
  _club_id uuid default null,
  _module_key text default null,
  _plan_key text default null,
  _limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := greatest(coalesce(_limit, 10), 1);
  v_range_from timestamptz := coalesce(_date_from, now() - interval '30 days');
  v_range_to timestamptz := coalesce(_date_to, now());
  v_result jsonb;
begin
  perform public.require_platform_permission('operator.analytics.read');

  with club_plans as (
    select distinct on (bs.club_id)
      bs.club_id,
      coalesce(pl.key, bs.plan_id) as plan_key
    from public.billing_subscriptions bs
    left join public.plans pl on pl.key = bs.plan_id
    order by bs.club_id, bs.updated_at desc nulls last
  ),
  scoped_events as (
    select ue.*
    from public.usage_events ue
    left join club_plans cp on cp.club_id = ue.club_id
    where ue.created_at >= v_range_from
      and ue.created_at <= v_range_to
      and (_club_id is null or ue.club_id = _club_id)
      and (_module_key is null or ue.module_key = _module_key)
      and (_plan_key is null or cp.plan_key = _plan_key)
  ),
  filter_scoped_events as (
    select ue.*
    from public.usage_events ue
    left join club_plans cp on cp.club_id = ue.club_id
    where (_club_id is null or ue.club_id = _club_id)
      and (_module_key is null or ue.module_key = _module_key)
      and (_plan_key is null or cp.plan_key = _plan_key)
  ),
  active_clubs as (
    select count(*)::integer as total
    from public.clubs c
    where coalesce(c.status, 'ACTIVE') = 'ACTIVE'
      and (_club_id is null or c.id = _club_id)
  ),
  active_users as (
    select
      count(distinct fse.user_id) filter (where fse.user_id is not null and fse.created_at >= now() - interval '24 hours')::integer as last_24_hours,
      count(distinct fse.user_id) filter (where fse.user_id is not null and fse.created_at >= now() - interval '7 days')::integer as last_7_days,
      count(distinct fse.user_id) filter (where fse.user_id is not null and fse.created_at >= now() - interval '30 days')::integer as last_30_days
    from filter_scoped_events fse
  ),
  new_users as (
    select count(distinct p.user_id)::integer as last_30_days
    from public.profiles p
    where p.created_at >= now() - interval '30 days'
      and (
        _club_id is null
        or exists (
          select 1
          from public.club_memberships cm
          where cm.user_id = p.user_id
            and cm.club_id = _club_id
        )
      )
      and (
        _plan_key is null
        or exists (
          select 1
          from public.club_memberships cm
          join club_plans cp on cp.club_id = cm.club_id
          where cm.user_id = p.user_id
            and cp.plan_key = _plan_key
        )
      )
  ),
  club_activity_ranked as (
    select
      se.club_id,
      c.name as club_name,
      c.slug as club_slug,
      count(*)::integer as event_count,
      max(se.created_at) as last_activity_at
    from scoped_events se
    join public.clubs c on c.id = se.club_id
    where se.club_id is not null
    group by se.club_id, c.name, c.slug
  ),
  inactive_clubs as (
    select
      c.id as club_id,
      c.name as club_name,
      c.slug as club_slug,
      c.updated_at as last_activity_at
    from public.clubs c
    left join club_plans cp on cp.club_id = c.id
    where coalesce(c.status, 'ACTIVE') = 'ACTIVE'
      and (_club_id is null or c.id = _club_id)
      and (_plan_key is null or cp.plan_key = _plan_key)
      and not exists (
        select 1
        from public.usage_events ue
        where ue.club_id = c.id
          and ue.created_at >= now() - interval '30 days'
      )
    order by c.name
    limit v_limit
  ),
  module_ranked as (
    select
      se.module_key,
      coalesce(m.name, se.module_key) as module_name,
      count(*)::integer as event_count
    from scoped_events se
    left join public.modules m on m.key = se.module_key
    where se.event_name = 'module_opened'
      and se.module_key is not null
    group by se.module_key, m.name
  ),
  module_by_plan as (
    select
      coalesce(cp.plan_key, 'unknown') as plan_key,
      coalesce(pl.name, cp.plan_key, 'Unknown plan') as plan_name,
      se.module_key,
      coalesce(m.name, se.module_key) as module_name,
      count(*)::integer as event_count
    from scoped_events se
    join club_plans cp on cp.club_id = se.club_id
    left join public.plans pl on pl.key = cp.plan_key
    left join public.modules m on m.key = se.module_key
    where se.event_name = 'module_opened'
      and se.module_key is not null
      and se.club_id is not null
    group by cp.plan_key, pl.name, se.module_key, m.name
    order by count(*) desc, plan_name, module_name
    limit v_limit * 3
  ),
  module_by_club as (
    select
      se.club_id,
      c.name as club_name,
      se.module_key,
      coalesce(m.name, se.module_key) as module_name,
      count(*)::integer as event_count
    from scoped_events se
    join public.clubs c on c.id = se.club_id
    left join public.modules m on m.key = se.module_key
    where se.event_name = 'module_opened'
      and se.module_key is not null
      and se.club_id is not null
    group by se.club_id, c.name, se.module_key, m.name
    order by count(*) desc, c.name, se.module_key
    limit v_limit * 3
  ),
  feature_counts as (
    select
      (
        select count(distinct se.club_id)::integer
        from scoped_events se
        where se.event_name = 'public_club_page_viewed'
          and se.club_id is not null
      ) as public_club_page_events,
      (
        select count(distinct c.id)::integer
        from public.clubs c
        left join club_plans cp on cp.club_id = c.id
        where c.is_public = true
          and coalesce(c.status, 'ACTIVE') = 'ACTIVE'
          and (_club_id is null or c.id = _club_id)
          and (_plan_key is null or cp.plan_key = _plan_key)
      ) as public_club_page_enabled,
      (
        select count(distinct se.club_id)::integer
        from scoped_events se
        where se.club_id is not null
          and (
            se.event_name = 'marketplace_opened'
            or (se.event_name = 'module_opened' and se.module_key = 'marketplace')
          )
      ) as marketplace,
      (
        select count(distinct se.club_id)::integer
        from scoped_events se
        where se.club_id is not null
          and (
            se.event_name = 'tournament_opened'
            or (se.event_name = 'module_opened' and se.module_key in ('events', 'matches'))
          )
      ) as tournament,
      (
        select count(distinct se.club_id)::integer
        from scoped_events se
        where se.club_id is not null
          and se.event_name = 'qr_code_scanned'
      ) as qr_code,
      (
        select count(distinct se.club_id)::integer
        from scoped_events se
        where se.club_id is not null
          and (
            se.event_name = 'module_opened'
            and se.module_key = 'partners'
          )
      ) as partner_management
  ),
  recent_events as (
    select
      se.id,
      se.event_name,
      se.module_key,
      se.route,
      se.created_at,
      c.name as club_name
    from scoped_events se
    left join public.clubs c on c.id = se.club_id
    order by se.created_at desc
    limit v_limit * 5
  )
  select jsonb_build_object(
    'generated_at', now(),
    'filters', jsonb_build_object(
      'date_from', v_range_from,
      'date_to', v_range_to,
      'club_id', _club_id,
      'module_key', _module_key,
      'plan_key', _plan_key,
      'limit', v_limit
    ),
    'active_users', jsonb_build_object(
      'last_24_hours', (select last_24_hours from active_users),
      'last_7_days', (select last_7_days from active_users),
      'last_30_days', (select last_30_days from active_users),
      'new_users_last_30_days', (select last_30_days from new_users)
    ),
    'club_activity', jsonb_build_object(
      'most_active_clubs', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.event_count desc, row.club_name)
        from (
          select club_id, club_name, club_slug, event_count, last_activity_at
          from club_activity_ranked
          order by event_count desc, club_name
          limit v_limit
        ) row
      ), '[]'::jsonb),
      'recently_active_clubs', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.last_activity_at desc)
        from (
          select club_id, club_name, club_slug, event_count, last_activity_at
          from club_activity_ranked
          order by last_activity_at desc
          limit v_limit
        ) row
      ), '[]'::jsonb),
      'inactive_clubs', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.club_name)
        from (
          select club_id, club_name, club_slug, last_activity_at
          from inactive_clubs
        ) row
      ), '[]'::jsonb),
      'no_activity_30_days_count', (select count(*)::integer from inactive_clubs)
    ),
    'module_usage', jsonb_build_object(
      'most_used', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.event_count desc, row.module_key)
        from (
          select module_key, module_name, event_count
          from module_ranked
          order by event_count desc, module_key
          limit v_limit
        ) row
      ), '[]'::jsonb),
      'least_used', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.event_count asc, row.module_key)
        from (
          select module_key, module_name, event_count
          from module_ranked
          order by event_count asc, module_key
          limit v_limit
        ) row
      ), '[]'::jsonb),
      'by_plan', coalesce((
        select jsonb_agg(to_jsonb(row))
        from (select * from module_by_plan) row
      ), '[]'::jsonb),
      'by_club', coalesce((
        select jsonb_agg(to_jsonb(row))
        from (select * from module_by_club) row
      ), '[]'::jsonb)
    ),
    'feature_adoption', jsonb_build_object(
      'total_active_clubs', (select total from active_clubs),
      'public_club_page', jsonb_build_object(
        'clubs_with_usage', (select public_club_page_events from feature_counts),
        'clubs_published', (select public_club_page_enabled from feature_counts)
      ),
      'marketplace', jsonb_build_object(
        'clubs_count', (select marketplace from feature_counts)
      ),
      'tournament', jsonb_build_object(
        'clubs_count', (select tournament from feature_counts)
      ),
      'qr_code', jsonb_build_object(
        'clubs_count', (select qr_code from feature_counts)
      ),
      'partner_management', jsonb_build_object(
        'clubs_count', (select partner_management from feature_counts)
      )
    ),
    'tables', jsonb_build_object(
      'top_clubs', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.event_count desc, row.club_name)
        from (
          select club_id, club_name, club_slug, event_count, last_activity_at
          from club_activity_ranked
          order by event_count desc, club_name
          limit v_limit
        ) row
      ), '[]'::jsonb),
      'top_modules', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.event_count desc, row.module_key)
        from (
          select module_key, module_name, event_count
          from module_ranked
          order by event_count desc, module_key
          limit v_limit
        ) row
      ), '[]'::jsonb),
      'recent_events', coalesce((
        select jsonb_agg(to_jsonb(row) order by row.created_at desc)
        from (select * from recent_events) row
      ), '[]'::jsonb)
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_operator_usage_analytics(timestamptz, timestamptz, uuid, text, text, integer) from public;
grant execute on function public.get_operator_usage_analytics(timestamptz, timestamptz, uuid, text, text, integer) to authenticated;
