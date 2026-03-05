-- Abuse controls slice 2:
-- - IP/device-aware throttling signals from request headers
-- - escalation cooldown after repeated blocked attempts
-- - minimal reviewer/admin audit RPC

create or replace function public.enforce_request_rate_limit(
  _action text,
  _club_id uuid,
  _identifier text,
  _max_attempts int,
  _window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identifier text;
  v_count int;
  v_device_count int;
  v_recent_blocked int;
  v_headers jsonb;
  v_ip text;
  v_user_agent text;
  v_device_key text;
begin
  v_identifier := lower(trim(coalesce(_identifier, '')));
  if v_identifier = '' then
    raise exception 'Missing rate limit identifier';
  end if;

  if _club_id is null then
    raise exception 'Missing club id for rate limit';
  end if;

  if coalesce(_max_attempts, 0) <= 0 then
    raise exception 'Invalid rate limit max attempts';
  end if;

  if _window is null or _window <= interval '0 seconds' then
    raise exception 'Invalid rate limit window';
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception
    when others then
      v_headers := '{}'::jsonb;
  end;
  v_headers := coalesce(v_headers, '{}'::jsonb);

  v_ip := lower(trim(coalesce(
    split_part(v_headers ->> 'x-forwarded-for', ',', 1),
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    'unknown-ip'
  )));
  v_user_agent := left(lower(trim(coalesce(v_headers ->> 'user-agent', 'unknown-ua'))), 300);
  v_device_key := md5(v_ip || '|' || v_user_agent);

  -- Escalation cooldown after repeated blocked attempts for same device.
  select count(*)
    into v_recent_blocked
  from public.request_rate_limits rl
  where rl.action = _action
    and rl.club_id = _club_id
    and rl.metadata ->> 'device_key' = v_device_key
    and rl.metadata ->> 'status' = 'blocked'
    and rl.created_at > now() - interval '24 hours';

  if v_recent_blocked >= 3 then
    insert into public.request_rate_limits(action, club_id, identifier, metadata)
    values (
      _action,
      _club_id,
      v_identifier,
      jsonb_build_object(
        'status', 'blocked',
        'reason', 'escalation_cooldown',
        'cooldown_hours', 12,
        'ip', v_ip,
        'user_agent', v_user_agent,
        'device_key', v_device_key
      )
    );
    raise exception 'Too many requests. Please try again later.';
  end if;

  -- Device-level pressure guard (many attempts from same device in short window).
  select count(*)
    into v_device_count
  from public.request_rate_limits rl
  where rl.action = _action
    and rl.club_id = _club_id
    and rl.metadata ->> 'device_key' = v_device_key
    and coalesce(rl.metadata ->> 'status', 'allowed') = 'allowed'
    and rl.created_at > now() - interval '15 minutes';

  if v_device_count >= greatest(_max_attempts * 2, 8) then
    insert into public.request_rate_limits(action, club_id, identifier, metadata)
    values (
      _action,
      _club_id,
      v_identifier,
      jsonb_build_object(
        'status', 'blocked',
        'reason', 'device_window_limit',
        'ip', v_ip,
        'user_agent', v_user_agent,
        'device_key', v_device_key
      )
    );
    raise exception 'Too many requests. Please try again later.';
  end if;

  -- Primary identifier limit.
  select count(*)
    into v_count
  from public.request_rate_limits rl
  where rl.action = _action
    and rl.club_id = _club_id
    and rl.identifier = v_identifier
    and coalesce(rl.metadata ->> 'status', 'allowed') = 'allowed'
    and rl.created_at > now() - _window;

  if v_count >= _max_attempts then
    insert into public.request_rate_limits(action, club_id, identifier, metadata)
    values (
      _action,
      _club_id,
      v_identifier,
      jsonb_build_object(
        'status', 'blocked',
        'reason', 'identifier_window_limit',
        'ip', v_ip,
        'user_agent', v_user_agent,
        'device_key', v_device_key
      )
    );
    raise exception 'Too many requests. Please try again later.';
  end if;

  insert into public.request_rate_limits(action, club_id, identifier, metadata)
  values (
    _action,
    _club_id,
    v_identifier,
    jsonb_build_object(
      'status', 'allowed',
      'ip', v_ip,
      'user_agent', v_user_agent,
      'device_key', v_device_key
    )
  );
end;
$$;

revoke all on function public.enforce_request_rate_limit(text, uuid, text, int, interval) from public;

create or replace function public.get_club_request_abuse_audit(
  _club_id uuid,
  _hours int default 24
)
returns table (
  action text,
  total_attempts bigint,
  allowed_attempts bigint,
  blocked_attempts bigint,
  unique_identifiers bigint,
  unique_devices bigint,
  last_attempt_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_hours int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_review_club_join_requests(auth.uid(), _club_id) then
    raise exception 'Only configured reviewers can view abuse audit';
  end if;

  v_hours := greatest(1, least(coalesce(_hours, 24), 168));

  return query
  select
    rl.action,
    count(*) as total_attempts,
    count(*) filter (where coalesce(rl.metadata ->> 'status', 'allowed') = 'allowed') as allowed_attempts,
    count(*) filter (where rl.metadata ->> 'status' = 'blocked') as blocked_attempts,
    count(distinct rl.identifier) as unique_identifiers,
    count(distinct rl.metadata ->> 'device_key') as unique_devices,
    max(rl.created_at) as last_attempt_at
  from public.request_rate_limits rl
  where rl.club_id = _club_id
    and rl.action in ('public_invite_request', 'public_join_request')
    and rl.created_at > now() - make_interval(hours => v_hours)
  group by rl.action
  order by rl.action;
end;
$$;

revoke all on function public.get_club_request_abuse_audit(uuid, int) from public;
grant execute on function public.get_club_request_abuse_audit(uuid, int) to authenticated;
