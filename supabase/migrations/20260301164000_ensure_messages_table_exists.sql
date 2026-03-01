-- Ensure chat core table exists in environments where baseline migrations were incomplete.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete set null,
  sender_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
  on public.messages
  for select
  to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
  on public.messages
  for insert
  to authenticated
  with check (public.is_member_of_club(auth.uid(), club_id) and sender_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
