-- Server-side aggregate for the ONE4Team Control Center overview.
-- This is platform-scoped and intentionally independent from club dashboard RBAC.

create or replace function public.get_operator_platform_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with authorized as (
    select (public.require_platform_permission('operator.overview.read') ->> 'is_platform_user')::boolean as ok
  ),
  club_counts as (
    select
      count(*)::integer as total_clubs,
      count(*) filter (where status = 'ACTIVE')::integer as active_clubs,
      count(*) filter (where status = 'SUSPENDED')::integer as suspended_clubs
    from public.clubs
  ),
  billing_counts as (
    select
      count(distinct club_id) filter (where status = 'trialing')::integer as trial_clubs,
      count(distinct club_id) filter (where status = 'active')::integer as paying_clubs
    from public.billing_subscriptions
  ),
  user_counts as (
    select
      count(distinct user_id)::integer as total_users,
      count(distinct user_id) filter (where updated_at >= now() - interval '7 days')::integer as active_users_last_7_days
    from public.profiles
  ),
  team_counts as (
    select count(*)::integer as total_teams
    from public.teams
  ),
  event_counts as (
    select count(*)::integer as total_events
    from public.events
  ),
  match_counts as (
    select count(*)::integer as total_matches
    from public.matches
  ),
  module_usage_rows as (
    select
      m.key,
      m.name,
      count(cme.id)::integer as usage_count
    from public.modules m
    left join public.club_module_entitlements cme
      on cme.module_id = m.id
      and cme.enabled = true
      and (cme.valid_until is null or cme.valid_until > now())
    group by m.key, m.name
    having count(cme.id) > 0
    order by count(cme.id) desc, m.name
    limit 5
  ),
  recent_created_clubs as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'status', c.status,
          'created_at', c.created_at,
          'updated_at', c.updated_at
        )
        order by c.created_at desc
      ),
      '[]'::jsonb
    ) as rows
    from (
      select id, name, slug, status, created_at, updated_at
      from public.clubs
      order by created_at desc
      limit 5
    ) c
  ),
  recent_active_clubs as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'status', c.status,
          'created_at', c.created_at,
          'updated_at', c.updated_at
        )
        order by c.updated_at desc
      ),
      '[]'::jsonb
    ) as rows
    from (
      select id, name, slug, status, created_at, updated_at
      from public.clubs
      order by updated_at desc
      limit 5
    ) c
  ),
  recent_audit as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'action', a.action,
          'actor_email', a.actor_email,
          'actor_role', a.actor_role,
          'entity_type', a.entity_type,
          'entity_id', a.entity_id,
          'club_id', a.club_id,
          'reason', a.reason,
          'created_at', a.created_at
        )
        order by a.created_at desc
      ),
      '[]'::jsonb
    ) as rows
    from (
      select *
      from public.audit_logs
      order by created_at desc
      limit 8
    ) a
  ),
  recent_issues as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', aa.id,
          'title', aa.reason,
          'source', 'abuse_alerts',
          'severity', aa.severity,
          'status', aa.status,
          'club_id', aa.club_id,
          'created_at', aa.created_at,
          'last_seen_at', aa.last_seen_at
        )
        order by aa.last_seen_at desc
      ),
      '[]'::jsonb
    ) as rows
    from (
      select *
      from public.abuse_alerts
      where status <> 'resolved'
      order by last_seen_at desc
      limit 8
    ) aa
  )
  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_clubs', cc.total_clubs,
      'active_clubs', cc.active_clubs,
      'trial_clubs', bc.trial_clubs,
      'paying_clubs', bc.paying_clubs,
      'suspended_clubs', cc.suspended_clubs,
      'total_users', uc.total_users,
      'active_users_last_7_days', uc.active_users_last_7_days,
      'total_teams', tc.total_teams,
      'total_events', ec.total_events,
      'total_matches', mc.total_matches,
      'most_used_module', (
        select case
          when mur.key is null then null
          else jsonb_build_object('key', mur.key, 'name', mur.name, 'usage_count', mur.usage_count)
        end
        from module_usage_rows mur
        limit 1
      ),
      'recent_issues', jsonb_array_length(ri.rows)
    ),
    'health', jsonb_build_array(
      jsonb_build_object(
        'label', 'Platform access',
        'status', 'operational',
        'description', 'Platform guard and overview RPC are responding.'
      ),
      jsonb_build_object(
        'label', 'Billing',
        'status', case when exists (select 1 from public.billing_subscriptions where status = 'past_due') then 'attention' else 'operational' end,
        'description', case when exists (select 1 from public.billing_subscriptions where status = 'past_due') then 'Some subscriptions need billing attention.' else 'No past-due subscriptions detected.' end
      ),
      jsonb_build_object(
        'label', 'Issues',
        'status', case when jsonb_array_length(ri.rows) > 0 then 'attention' else 'operational' end,
        'description', case when jsonb_array_length(ri.rows) > 0 then 'Open issue signals are present.' else 'No open issue signals detected.' end
      )
    ),
    'recent_created_clubs', rcc.rows,
    'recent_active_clubs', rac.rows,
    'module_usage', coalesce((select jsonb_agg(to_jsonb(mur.*)) from module_usage_rows mur), '[]'::jsonb),
    'recent_audit', ra.rows,
    'recent_issues', ri.rows,
    'generated_at', now()
  )
  from authorized
  cross join club_counts cc
  cross join billing_counts bc
  cross join user_counts uc
  cross join team_counts tc
  cross join event_counts ec
  cross join match_counts mc
  cross join recent_created_clubs rcc
  cross join recent_active_clubs rac
  cross join recent_audit ra
  cross join recent_issues ri;
$$;

revoke all on function public.get_operator_platform_overview() from public;
grant execute on function public.get_operator_platform_overview() to authenticated;
