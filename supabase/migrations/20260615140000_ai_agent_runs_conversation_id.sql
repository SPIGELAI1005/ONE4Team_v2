-- Link agent workflow runs to saved Co-Trainer chats (Phase 4).

alter table public.ai_agent_runs
  add column if not exists conversation_id uuid references public.ai_conversations(id) on delete set null;

create index if not exists idx_ai_agent_runs_conversation
  on public.ai_agent_runs (conversation_id)
  where conversation_id is not null;
