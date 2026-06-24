-- AI 4 T Phase 2–4: duplicate training week RPC, club AI instructions, usage stats.

alter table public.club_llm_settings
  add column if not exists club_ai_instructions text;

comment on column public.club_llm_settings.club_ai_instructions is
  'Admin-only custom instructions appended to AI 4 T system prompts for this club.';

create or replace function public.agent_duplicate_training_week_sessions(
  _club_id uuid,
  _user_id uuid,
  _team_id uuid default null,
  _days_shift int default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _from timestamptz;
  _to timestamptz;
  _sessions jsonb;
  _count int;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    raise exception 'not_member';
  end if;
  if not public.is_club_trainer(_user_id, _club_id) then
    raise exception 'not_authorized';
  end if;

  if _team_id is not null and not public.can_manage_team_training(_user_id, _club_id, _team_id) then
    raise exception 'not_team_trainer';
  end if;

  if _team_id is null and not public.is_club_admin(_user_id, _club_id) then
    raise exception 'team_required';
  end if;

  _from := now() - interval '14 days';
  _to := now() - interval '7 days';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', a.title,
        'starts_at', a.starts_at + make_interval(days => _days_shift),
        'ends_at', a.ends_at + make_interval(days => _days_shift),
        'location', a.location,
        'team_id', a.team_id
      )
      order by a.starts_at
    ),
    '[]'::jsonb
  )
  into _sessions
  from public.activities a
  where a.club_id = _club_id
    and a.type = 'training'
    and a.starts_at >= _from
    and a.starts_at < _to
    and (_team_id is null or a.team_id = _team_id);

  _count := coalesce(jsonb_array_length(_sessions), 0);

  return jsonb_build_object(
    'sessions', _sessions,
    'source_count', _count,
    'days_shift', _days_shift,
    'source_from', _from,
    'source_to', _to
  );
exception
  when undefined_table then
    raise exception 'activities_table_missing';
end;
$$;

create or replace function public.get_club_ai_usage_stats(
  _club_id uuid,
  _from timestamptz default (now() - interval '30 days'),
  _to timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _conversations int := 0;
  _agent_total int := 0;
  _agent_executed int := 0;
  _agent_failed int := 0;
  _by_intent jsonb := '[]'::jsonb;
begin
  if not public.is_club_admin(auth.uid(), _club_id) then
    raise exception 'not_authorized';
  end if;

  select count(*)::int into _conversations
  from public.ai_conversations c
  where c.club_id = _club_id
    and c.updated_at >= _from
    and c.updated_at <= _to;

  select
    count(*)::int,
    count(*) filter (where r.status = 'executed')::int,
    count(*) filter (where r.status = 'failed')::int
  into _agent_total, _agent_executed, _agent_failed
  from public.ai_agent_runs r
  where r.club_id = _club_id
    and r.created_at >= _from
    and r.created_at <= _to;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'intent', x.intent,
        'total', x.total,
        'executed', x.executed
      )
      order by x.total desc
    ),
    '[]'::jsonb
  )
  into _by_intent
  from (
    select
      r.intent,
      count(*)::int as total,
      count(*) filter (where r.status = 'executed')::int as executed
    from public.ai_agent_runs r
    where r.club_id = _club_id
      and r.created_at >= _from
      and r.created_at <= _to
    group by r.intent
  ) x;

  return jsonb_build_object(
    'from', _from,
    'to', _to,
    'conversations_updated', _conversations,
    'agent_runs_total', _agent_total,
    'agent_runs_executed', _agent_executed,
    'agent_runs_failed', _agent_failed,
    'agent_runs_by_intent', _by_intent
  );
exception
  when undefined_table then
    return jsonb_build_object(
      'from', _from,
      'to', _to,
      'conversations_updated', 0,
      'agent_runs_total', 0,
      'agent_runs_executed', 0,
      'agent_runs_failed', 0,
      'agent_runs_by_intent', '[]'::jsonb,
      'note', 'ai_tables_missing'
    );
end;
$$;

grant execute on function public.agent_duplicate_training_week_sessions(uuid, uuid, uuid, int)
  to authenticated, service_role;
grant execute on function public.get_club_ai_usage_stats(uuid, timestamptz, timestamptz)
  to authenticated, service_role;
