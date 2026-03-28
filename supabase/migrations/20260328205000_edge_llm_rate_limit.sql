-- Per-(user, club) sliding window rate limit for LLM Edge Functions (invoked with service role).

create table if not exists public.edge_llm_minute_buckets (
  user_id uuid not null,
  club_id uuid not null,
  window_minute timestamptz not null,
  cnt integer not null default 0,
  primary key (user_id, club_id, window_minute)
);

create index if not exists idx_edge_llm_buckets_window
  on public.edge_llm_minute_buckets (window_minute desc);

alter table public.edge_llm_minute_buckets enable row level security;

comment on table public.edge_llm_minute_buckets is
  'Internal rate limiting for Edge LLM calls; accessed only via service role + consume_edge_llm_quota.';

create or replace function public.consume_edge_llm_quota(
  _user_id uuid,
  _club_id uuid,
  _max_per_minute int default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minute timestamptz := date_trunc('minute', (now() at time zone 'utc'));
  v_cnt int;
begin
  if _max_per_minute < 1 then
    _max_per_minute := 1;
  end if;
  if _max_per_minute > 200 then
    _max_per_minute := 200;
  end if;

  insert into public.edge_llm_minute_buckets (user_id, club_id, window_minute, cnt)
  values (_user_id, _club_id, v_minute, 1)
  on conflict (user_id, club_id, window_minute)
  do update set cnt = edge_llm_minute_buckets.cnt + 1
  returning cnt into v_cnt;

  return jsonb_build_object(
    'allowed', v_cnt <= _max_per_minute,
    'count', v_cnt
  );
end;
$$;

revoke all on function public.consume_edge_llm_quota(uuid, uuid, int) from public;
grant execute on function public.consume_edge_llm_quota(uuid, uuid, int) to service_role;

-- Document encryption expectation when club_llm_settings exists (optional table on older DBs).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'club_llm_settings' and column_name = 'api_key'
  ) then
    execute $c$comment on column public.club_llm_settings.api_key is
      'Provider API key (plaintext). Prefer envelope encryption or Supabase Vault for production.'$c$;
  end if;
end $$;
