-- Club roles optimization: add team_management, fan, supporter to app_role
-- and extend club_role_assignments role_kind check. Also add team-scoped
-- trainer helper used by roster write RLS.

-- ---------------------------------------------------------------------------
-- 1) New membership roles on public.app_role
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'team_management'
  ) then
    alter type public.app_role add value 'team_management';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'fan'
  ) then
    alter type public.app_role add value 'fan';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'supporter'
  ) then
    alter type public.app_role add value 'supporter';
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2) Allow new kinds on club_role_assignments
-- ---------------------------------------------------------------------------
alter table public.club_role_assignments
  drop constraint if exists club_role_assignments_role_kind_check;

alter table public.club_role_assignments
  add constraint club_role_assignments_role_kind_check check (
    role_kind in (
      'club_admin',
      'team_admin',
      'trainer',
      'player',
      'player_teen',
      'player_adult',
      'parent',
      'staff',
      'team_management',
      'member',
      'fan',
      'supporter',
      'sponsor',
      'supplier',
      'service_provider',
      'consultant'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Team-scoped trainer capability (assigned teams only; not bare club-wide)
-- ---------------------------------------------------------------------------
create or replace function public.is_trainer_for_team(_user_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    join public.club_memberships cm
      on cm.club_id = t.club_id
     and cm.user_id = _user_id
     and cm.status = 'active'
    where t.id = _team_id
      and (
        public.is_club_admin(_user_id, t.club_id)
        or exists (
          select 1
          from public.club_role_assignments cra
          where cra.membership_id = cm.id
            and cra.club_id = t.club_id
            and (
              (cra.role_kind in ('club_admin', 'trainer', 'team_management') and cra.scope = 'club')
              or (
                cra.role_kind in ('trainer', 'team_admin')
                and cra.scope = 'team'
                and cra.scope_team_id = _team_id
              )
            )
        )
        or exists (
          select 1
          from public.team_coaches tc
          where tc.team_id = _team_id
            and tc.membership_id = cm.id
        )
      )
  );
$$;

grant execute on function public.is_trainer_for_team(uuid, uuid) to authenticated;

-- Roster writes: trainers only for assigned teams (not every team in the club)
drop policy if exists "Admins and trainers can insert team players" on public.team_players;
drop policy if exists "Admins and trainers can update team players" on public.team_players;
drop policy if exists "Admins and trainers can delete team players" on public.team_players;

create policy "Admins and trainers can insert team players"
  on public.team_players for insert
  to authenticated
  with check (public.is_trainer_for_team(auth.uid(), team_id));

create policy "Admins and trainers can update team players"
  on public.team_players for update
  to authenticated
  using (public.is_trainer_for_team(auth.uid(), team_id))
  with check (public.is_trainer_for_team(auth.uid(), team_id));

create policy "Admins and trainers can delete team players"
  on public.team_players for delete
  to authenticated
  using (public.is_trainer_for_team(auth.uid(), team_id));

drop policy if exists "Admins and trainers can update teams" on public.teams;

create policy "Admins and trainers can update teams"
  on public.teams for update
  to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_trainer_for_team(auth.uid(), id)
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_trainer_for_team(auth.uid(), id)
  );
