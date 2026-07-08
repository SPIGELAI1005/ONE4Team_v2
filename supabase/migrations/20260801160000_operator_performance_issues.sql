-- Initial operator performance and issues overviews for the Control Center.
-- Uses existing platform signals where available; external monitoring remains pluggable.

create or replace function public.get_operator_performance_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  open_abuse_alerts integer;
  high_severity_open integer;
  past_due_billing integer;
  app_status text := 'operational';
  app_status_description text := 'Core platform signals look healthy.';
  db_size_bytes bigint;
  db_ping_ms numeric;
  ping_started timestamptz;
begin
  perform public.require_platform_permission('operator.logs.read');

  select count(*)::integer,
         count(*) filter (where severity = 'high')::integer
  into open_abuse_alerts, high_severity_open
  from public.abuse_alerts
  where status = 'open';

  select count(distinct club_id)::integer
  into past_due_billing
  from public.billing_subscriptions
  where status = 'past_due';

  if high_severity_open > 0 then
    app_status := 'degraded';
    app_status_description := 'High-severity open abuse alerts require attention.';
  elsif open_abuse_alerts > 0 or past_due_billing > 0 then
    app_status := 'attention';
    app_status_description := case
      when open_abuse_alerts > 0 and past_due_billing > 0 then 'Open abuse alerts and past-due billing subscriptions need review.'
      when open_abuse_alerts > 0 then 'Open abuse alerts are present on the platform.'
      else 'Some billing subscriptions are past due.'
    end;
  end if;

  select pg_database_size(current_database()) into db_size_bytes;

  ping_started := clock_timestamp();
  perform 1 from public.clubs limit 1;
  db_ping_ms := round(extract(epoch from (clock_timestamp() - ping_started)) * 1000, 2);

  return jsonb_build_object(
    'generated_at', now(),
    'app_status', app_status,
    'app_status_description', app_status_description,
    'signals', jsonb_build_object(
      'open_abuse_alerts', open_abuse_alerts,
      'high_severity_open_abuse_alerts', high_severity_open,
      'past_due_billing_subscriptions', past_due_billing
    ),
    'integrations', jsonb_build_object(
      'vercel', jsonb_build_object('connected', false, 'label', 'Vercel'),
      'supabase_metrics', jsonb_build_object('connected', true, 'label', 'Supabase'),
      'sentry', jsonb_build_object('connected', false, 'label', 'Sentry'),
      'custom_logs', jsonb_build_object('connected', false, 'label', 'Custom logs')
    ),
    'last_deployment', jsonb_build_object(
      'connected', false,
      'deployed_at', null,
      'environment', null,
      'source', 'vercel'
    ),
    'metrics', jsonb_build_object(
      'avg_page_load_ms', jsonb_build_object('connected', false, 'value', null),
      'api_error_rate', jsonb_build_object('connected', false, 'value', null),
      'database_response_ms', jsonb_build_object('connected', true, 'value', db_ping_ms),
      'database_size_bytes', jsonb_build_object('connected', true, 'value', db_size_bytes)
    ),
    'slowest_routes', jsonb_build_object(
      'connected', false,
      'items', '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.get_operator_issues_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  failed_notifications integer;
  open_abuse_alerts integer;
begin
  perform public.require_platform_permission('operator.logs.read');

  select count(*)::integer
  into failed_notifications
  from public.abuse_notification_events
  where status = 'failed'
    and created_at >= now() - interval '7 days';

  select count(*)::integer
  into open_abuse_alerts
  from public.abuse_alerts
  where status = 'open';

  return jsonb_build_object(
    'generated_at', now(),
    'integrations', jsonb_build_object(
      'sentry', jsonb_build_object('connected', false, 'label', 'Sentry'),
      'vercel_logs', jsonb_build_object('connected', false, 'label', 'Vercel logs'),
      'supabase_logs', jsonb_build_object('connected', false, 'label', 'Supabase logs'),
      'email_delivery', jsonb_build_object('connected', false, 'label', 'Email delivery')
    ),
    'summary', jsonb_build_object(
      'open_technical_issues', open_abuse_alerts,
      'failed_notification_events_7d', failed_notifications,
      'failed_api_requests_24h', null,
      'failed_invite_delivery_7d', null,
      'database_warnings', 0
    ),
    'recent_errors', jsonb_build_object(
      'connected', false,
      'items', '[]'::jsonb
    ),
    'failed_api_requests', jsonb_build_object(
      'connected', false,
      'items', '[]'::jsonb
    ),
    'failed_email_delivery', jsonb_build_object(
      'connected', false,
      'items', '[]'::jsonb,
      'hint', 'Invite and transactional email delivery monitoring is not connected yet.'
    ),
    'database_warnings', jsonb_build_object(
      'connected', false,
      'items', '[]'::jsonb
    ),
    'open_technical_issues', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'title', a.reason,
          'source', 'abuse_alerts',
          'severity', a.severity,
          'status', a.status,
          'club_id', a.club_id,
          'club_name', c.name,
          'created_at', a.created_at,
          'last_seen_at', a.last_seen_at
        )
        order by a.last_seen_at desc
      )
      from (
        select *
        from public.abuse_alerts
        where status = 'open'
        order by last_seen_at desc
        limit 20
      ) a
      join public.clubs c on c.id = a.club_id
    ), '[]'::jsonb),
    'failed_notification_events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'club_id', e.club_id,
          'club_name', c.name,
          'status', e.status,
          'last_error', left(coalesce(e.last_error, ''), 240),
          'created_at', e.created_at
        )
        order by e.created_at desc
      )
      from (
        select *
        from public.abuse_notification_events
        where status = 'failed'
          and created_at >= now() - interval '7 days'
        order by created_at desc
        limit 10
      ) e
      join public.clubs c on c.id = e.club_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_operator_performance_overview() from public;
revoke all on function public.get_operator_issues_overview() from public;

grant execute on function public.get_operator_performance_overview() to authenticated;
grant execute on function public.get_operator_issues_overview() to authenticated;
