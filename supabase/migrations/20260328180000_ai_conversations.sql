-- Persisted ONE4AI chat sessions (per user, per club)

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_club_user_updated
  on public.ai_conversations (club_id, user_id, updated_at desc);

alter table public.ai_conversations enable row level security;

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
create policy "ai_conversations_select_own"
on public.ai_conversations for select to authenticated
using (
  auth.uid() = user_id
  and public.is_member_of_club(auth.uid(), club_id)
);

drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
create policy "ai_conversations_insert_own"
on public.ai_conversations for insert to authenticated
with check (
  auth.uid() = user_id
  and public.is_member_of_club(auth.uid(), club_id)
);

drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
create policy "ai_conversations_update_own"
on public.ai_conversations for update to authenticated
using (
  auth.uid() = user_id
  and public.is_member_of_club(auth.uid(), club_id)
)
with check (
  auth.uid() = user_id
  and public.is_member_of_club(auth.uid(), club_id)
);

drop policy if exists "ai_conversations_delete_own" on public.ai_conversations;
create policy "ai_conversations_delete_own"
on public.ai_conversations for delete to authenticated
using (
  auth.uid() = user_id
  and public.is_member_of_club(auth.uid(), club_id)
);

drop trigger if exists update_ai_conversations_updated_at on public.ai_conversations;
create trigger update_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.update_updated_at();
