-- Per-message thumbs feedback for AI 4 T chat (Co-Trainer / embed).

create table if not exists public.ai_message_feedback (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  message_index integer not null check (message_index >= 0),
  rating smallint not null check (rating in (-1, 1)),
  note text,
  assistant_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_message_feedback_user_message_unique
    unique (user_id, conversation_id, message_index)
);

create index if not exists idx_ai_message_feedback_club_created
  on public.ai_message_feedback (club_id, created_at desc);

alter table public.ai_message_feedback enable row level security;

drop policy if exists "ai_message_feedback_select_own_or_admin" on public.ai_message_feedback;
create policy "ai_message_feedback_select_own_or_admin"
on public.ai_message_feedback for select to authenticated
using (
  auth.uid() = user_id
  or public.is_club_admin(auth.uid(), club_id)
);

drop policy if exists "ai_message_feedback_insert_own" on public.ai_message_feedback;
create policy "ai_message_feedback_insert_own"
on public.ai_message_feedback for insert to authenticated
with check (
  auth.uid() = user_id
  and public.is_member_of_club(auth.uid(), club_id)
);

drop policy if exists "ai_message_feedback_update_own" on public.ai_message_feedback;
create policy "ai_message_feedback_update_own"
on public.ai_message_feedback for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists update_ai_message_feedback_updated_at on public.ai_message_feedback;
create trigger update_ai_message_feedback_updated_at
before update on public.ai_message_feedback
for each row execute function public.update_updated_at();
