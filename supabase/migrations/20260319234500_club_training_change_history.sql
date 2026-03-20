-- Training area change history for manual updates and Excel uploads.

create table if not exists public.club_training_change_history (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  scope text not null check (scope in ('teams', 'sessions', 'uploads')),
  action text not null check (action in ('create', 'update', 'delete', 'upload')),
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_training_change_history_club_time
  on public.club_training_change_history(club_id, created_at desc);

alter table public.club_training_change_history enable row level security;

drop policy if exists club_training_change_history_select_member on public.club_training_change_history;
create policy club_training_change_history_select_member
on public.club_training_change_history
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_training_change_history_insert_trainer on public.club_training_change_history;
create policy club_training_change_history_insert_trainer
on public.club_training_change_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = club_training_change_history.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
);
