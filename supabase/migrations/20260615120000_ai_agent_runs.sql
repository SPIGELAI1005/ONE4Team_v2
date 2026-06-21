-- AI4Team Agent: proposal + execution audit trail (propose → confirm → execute).

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in (
    'proposed', 'confirmed', 'executed', 'failed', 'cancelled', 'expired'
  )),
  intent text not null,
  page_context jsonb not null default '{}'::jsonb,
  proposal jsonb not null default '{}'::jsonb,
  execution_result jsonb,
  error_message text,
  idempotency_key text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  executed_at timestamptz
);

create unique index if not exists idx_ai_agent_runs_idempotency
  on public.ai_agent_runs (club_id, user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_ai_agent_runs_club_user_created
  on public.ai_agent_runs (club_id, user_id, created_at desc);

alter table public.ai_agent_runs enable row level security;

drop policy if exists ai_agent_runs_select_own on public.ai_agent_runs;
create policy ai_agent_runs_select_own
on public.ai_agent_runs
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_club_trainer(auth.uid(), club_id)
);

drop policy if exists ai_agent_runs_insert_own on public.ai_agent_runs;
create policy ai_agent_runs_insert_own
on public.ai_agent_runs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_member_of_club(auth.uid(), club_id)
);

drop policy if exists ai_agent_runs_update_own on public.ai_agent_runs;
create policy ai_agent_runs_update_own
on public.ai_agent_runs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
