-- Abuse controls slice 3:
-- - gateway/edge risk heuristics
-- - sustained-abuse alert hooks
-- - reviewer/admin alert retrieval + resolve RPCs

create table if not exists public.abuse_alerts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  action text not null check (action in ('public_invite_request', 'public_join_request')),
  reason text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  blocked_count int not null default 0,
  total_count int not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_abuse_alerts_club_status_last_seen
  on public.abuse_alerts(club_id, status, last_seen_at desc);

alter table public.abuse_alerts enable row level security;

drop policy if exists "abuse_alerts_select_reviewer" on public.abuse_alerts;
create policy "abuse_alerts_select_reviewer"
  on public.abuse_alerts for select
  using (public.can_review_club_join_requests(auth.uid(), club_id));

drop policy if exists "abuse_alerts_update_reviewer" on public.abuse_alerts;
create policy "abuse_alerts_update_reviewer"
  on public.abuse_alerts for update
  using (public.can_review_club_join_requests(auth.uid(), club_id))
  with check (public.can_review_club_join_requests(auth.uid(), club_id));

create or replace function public.raise_abuse_alert(
  _club_id uuid,
  _action text,
  _reason text,
  _severity text,
  _blocked_inc int default 0,
  _metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
begin
  select a.id
    into v_existing_id
  from public.abuse_alerts a
  where a.club_id = _club_id
    and a.action = _action
    and a.reason = _reason
    and a.status = 'open'
    and a.last_seen_at > now() - interval '6 hours'
  order by a.last_seen_at desc
  limit 1;

  if v_existing_id is not null then
    update public.abuse_alerts
    set
      severity = case
        when _severity = 'high' then 'high'
        when severity = 'high' then 'high'
        when _severity = 'medium' then 'medium'
        else severity
      end,
      blocked_count = blocked_count + greatest(coalesce(_blocked_inc, 0), 0),
      total_count = total_count + 1,
      last_seen_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(_metadata, '{}'::jsonb),
      updated_at = now()
    where id = v_existing_id;
    return;
  end if;

  insert into public.abuse_alerts (
    club_id,
    action,
    reason,
    severity,
    blocked_count,
    total_count,
    metadata
  )
  values (
    _club_id,
    _action,
    _reason,
    case when _severity in ('low', 'medium', 'high') then _severity else 'medium' end,
    greatest(coalesce(_blocked_inc, 0), 0),
    1,
    coalesce(_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.raise_abuse_alert(uuid, text, text, text, int, jsonb) from public;

create or replace function public.get_club_abuse_alerts(
  _club_id uuid,
  _status text default 'open',
  _limit int default 20
)
returns table (
  id uuid,
  action text,
  reason text,
  severity text,
  status text,
  blocked_count int,
  total_count int,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  resolved_at timestamptz,
  resolution_note text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_status text;
  v_limit int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_review_club_join_requests(auth.uid(), _club_id) then
    raise exception 'Only configured reviewers can view abuse alerts';
  end if;

  v_status := case when _status in ('open', 'resolved', 'all') then _status else 'open' end;
  v_limit := greatest(1, least(coalesce(_limit, 20), 100));

  return query
  select
    a.id,
    a.action,
    a.reason,
    a.severity,
    a.status,
    a.blocked_count,
    a.total_count,
    a.first_seen_at,
    a.last_seen_at,
    a.resolved_at,
    a.resolution_note
  from public.abuse_alerts a
  where a.club_id = _club_id
    and (v_status = 'all' or a.status = v_status)
  order by a.last_seen_at desc
  limit v_limit;
end;
$$;

revoke all on function public.get_club_abuse_alerts(uuid, text, int) from public;
grant execute on function public.get_club_abuse_alerts(uuid, text, int) to authenticated;

create or replace function public.resolve_club_abuse_alert(
  _alert_id uuid,
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_alert public.abuse_alerts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_alert
  from public.abuse_alerts
  where id = _alert_id;

  if not found then
    raise exception 'Alert not found';
  end if;

  if not public.can_review_club_join_requests(auth.uid(), v_alert.club_id) then
    raise exception 'Only configured reviewers can resolve abuse alerts';
  end if;

  update public.abuse_alerts
  set
    status = 'resolved',
    resolved_at = now(),
    resolution_note = nullif(trim(coalesce(_note, '')), ''),
    updated_at = now()
  where id = _alert_id;
end;
$$;

revoke all on function public.resolve_club_abuse_alert(uuid, text) from public;
grant execute on function public.resolve_club_abuse_alert(uuid, text) to authenticated;

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
  v_country text;
  v_bot_score int;
  v_gateway_risk_score int := 0;
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
  v_country := lower(trim(coalesce(
    v_headers ->> 'x-vercel-ip-country',
    v_headers ->> 'cf-ipcountry',
    v_headers ->> 'x-country',
    'unknown'
  )));
  v_device_key := md5(v_ip || '|' || v_user_agent);

  begin
    v_bot_score := nullif(regexp_replace(coalesce(v_headers ->> 'x-bot-score', v_headers ->> 'cf-bot-score', ''), '[^0-9]', '', 'g'), '')::int;
  exception
    when others then
      v_bot_score := null;
  end;

  if v_bot_score is not null then
    if v_bot_score <= 30 then v_gateway_risk_score := v_gateway_risk_score + 60; end if;
    if v_bot_score > 30 and v_bot_score <= 50 then v_gateway_risk_score := v_gateway_risk_score + 35; end if;
  end if;
  if v_user_agent ~ '(curl|python|httpclient|bot|scrapy|wget)' then v_gateway_risk_score := v_gateway_risk_score + 25; end if;
  if v_ip = 'unknown-ip' then v_gateway_risk_score := v_gateway_risk_score + 10; end if;
  if v_country in ('unknown', 'xx') then v_gateway_risk_score := v_gateway_risk_score + 5; end if;

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
        'country', v_country,
        'user_agent', v_user_agent,
        'device_key', v_device_key,
        'gateway_risk_score', v_gateway_risk_score,
        'bot_score', v_bot_score
      )
    );
    perform public.raise_abuse_alert(
      _club_id,
      _action,
      'escalation_cooldown',
      'high',
      1,
      jsonb_build_object('ip', v_ip, 'country', v_country, 'gateway_risk_score', v_gateway_risk_score, 'bot_score', v_bot_score)
    );
    raise exception 'Too many requests. Please try again later.';
  end if;

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
        'country', v_country,
        'user_agent', v_user_agent,
        'device_key', v_device_key,
        'gateway_risk_score', v_gateway_risk_score,
        'bot_score', v_bot_score
      )
    );
    perform public.raise_abuse_alert(
      _club_id,
      _action,
      'device_window_limit',
      'medium',
      1,
      jsonb_build_object('ip', v_ip, 'country', v_country, 'gateway_risk_score', v_gateway_risk_score, 'bot_score', v_bot_score)
    );
    raise exception 'Too many requests. Please try again later.';
  end if;

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
        'country', v_country,
        'user_agent', v_user_agent,
        'device_key', v_device_key,
        'gateway_risk_score', v_gateway_risk_score,
        'bot_score', v_bot_score
      )
    );
    perform public.raise_abuse_alert(
      _club_id,
      _action,
      'identifier_window_limit',
      'medium',
      1,
      jsonb_build_object('ip', v_ip, 'country', v_country, 'gateway_risk_score', v_gateway_risk_score, 'bot_score', v_bot_score)
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
      'country', v_country,
      'user_agent', v_user_agent,
      'device_key', v_device_key,
      'gateway_risk_score', v_gateway_risk_score,
      'bot_score', v_bot_score
    )
  );

  if v_gateway_risk_score >= 70 then
    perform public.raise_abuse_alert(
      _club_id,
      _action,
      'gateway_high_risk_signal',
      'high',
      0,
      jsonb_build_object('ip', v_ip, 'country', v_country, 'gateway_risk_score', v_gateway_risk_score, 'bot_score', v_bot_score)
    );
  elsif v_gateway_risk_score >= 50 then
    perform public.raise_abuse_alert(
      _club_id,
      _action,
      'gateway_medium_risk_signal',
      'medium',
      0,
      jsonb_build_object('ip', v_ip, 'country', v_country, 'gateway_risk_score', v_gateway_risk_score, 'bot_score', v_bot_score)
    );
  end if;
end;
$$;

revoke all on function public.enforce_request_rate_limit(text, uuid, text, int, interval) from public;
