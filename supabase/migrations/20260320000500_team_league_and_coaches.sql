-- Team enrichment: league metadata + coach assignments from memberships.

alter table public.teams
  add column if not exists league text;

create table if not exists public.team_coaches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, membership_id)
);

create index if not exists idx_team_coaches_team_id on public.team_coaches(team_id);
create index if not exists idx_team_coaches_membership_id on public.team_coaches(membership_id);

alter table public.team_coaches enable row level security;

drop policy if exists team_coaches_select_member on public.team_coaches;
create policy team_coaches_select_member
on public.team_coaches
for select
to authenticated
using (
  exists (
    select 1
    from public.teams t
    where t.id = team_coaches.team_id
      and public.is_member_of_club(auth.uid(), t.club_id)
  )
);

drop policy if exists team_coaches_manage_trainer on public.team_coaches;
create policy team_coaches_manage_trainer
on public.team_coaches
for all
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.club_memberships cm on cm.club_id = t.club_id
    where t.id = team_coaches.team_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.teams t
    join public.club_memberships cm on cm.club_id = t.club_id
    where t.id = team_coaches.team_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
);
