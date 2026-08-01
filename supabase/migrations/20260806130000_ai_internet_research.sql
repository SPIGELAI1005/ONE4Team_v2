-- AI 4 T GPT Internet: admin toggle, user consent, audit log, monthly usage caps.

alter table public.club_llm_settings
  add column if not exists internet_research_enabled boolean not null default true;

comment on column public.club_llm_settings.internet_research_enabled is
  'When false, club members cannot use AI 4 T GPT Internet mode (Pro+ plan still required).';

create table if not exists public.ai_internet_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  consented_at timestamptz not null default now(),
  primary key (user_id, club_id)
);

alter table public.ai_internet_consents enable row level security;

drop policy if exists ai_internet_consents_select_own on public.ai_internet_consents;
create policy ai_internet_consents_select_own
  on public.ai_internet_consents for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists ai_internet_consents_insert_own on public.ai_internet_consents;
create policy ai_internet_consents_insert_own
  on public.ai_internet_consents for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_member_of_club(auth.uid(), club_id)
  );

create table if not exists public.ai_internet_usage_log (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  search_query text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_internet_usage_log_club_created
  on public.ai_internet_usage_log (club_id, created_at desc);

alter table public.ai_internet_usage_log enable row level security;

drop policy if exists ai_internet_usage_log_select_admin on public.ai_internet_usage_log;
create policy ai_internet_usage_log_select_admin
  on public.ai_internet_usage_log for select to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create or replace function public.has_ai_internet_consent(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ai_internet_consents c
    where c.club_id = _club_id
      and c.user_id = auth.uid()
  );
$$;

grant execute on function public.has_ai_internet_consent(uuid) to authenticated;

-- Extend monthly usage JSON with internet_research_sessions (admins + edge service role).
create or replace function public.get_club_ai_monthly_usage(_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := date_trunc('month', now());
  _to timestamptz := now();
  _conversations int := 0;
  _agent_total int := 0;
  _internet int := 0;
begin
  if auth.uid() is not null and not public.is_club_admin(_club_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select count(*)::int into _conversations
  from public.ai_conversations c
  where c.club_id = _club_id
    and c.updated_at >= _from
    and c.updated_at <= _to;

  select count(*)::int into _agent_total
  from public.ai_agent_runs r
  where r.club_id = _club_id
    and r.created_at >= _from
    and r.created_at <= _to;

  select count(*)::int into _internet
  from public.ai_internet_usage_log l
  where l.club_id = _club_id
    and l.created_at >= _from
    and l.created_at <= _to;

  return jsonb_build_object(
    'period', 'month',
    'from', _from,
    'to', _to,
    'conversations_updated', _conversations,
    'agent_runs_total', _agent_total,
    'internet_research_sessions', _internet
  );
exception
  when undefined_table then
    return jsonb_build_object(
      'period', 'month',
      'from', _from,
      'to', _to,
      'conversations_updated', 0,
      'agent_runs_total', 0,
      'internet_research_sessions', 0
    );
end;
$$;

grant execute on function public.get_club_ai_monthly_usage(uuid) to authenticated, service_role;

-- Extend admin usage RPC (Settings + dashboard card) with internet session counts.
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
  _internet int := 0;
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

  select count(*)::int into _internet
  from public.ai_internet_usage_log l
  where l.club_id = _club_id
    and l.created_at >= _from
    and l.created_at <= _to;

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
    'agent_runs_by_intent', _by_intent,
    'internet_research_sessions', _internet
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
      'internet_research_sessions', 0,
      'note', 'ai_tables_missing'
    );
end;
$$;

grant execute on function public.get_club_ai_usage_stats(uuid, timestamptz, timestamptz)
  to authenticated, service_role;
