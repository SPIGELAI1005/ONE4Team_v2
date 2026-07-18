-- Team roster assignment RLS:
-- - Club admins: manage team_players + team_coaches; update teams
-- - Trainers: manage team_players; update teams (player roster / meta)
-- - Players/members: no writes

-- team_players: allow trainers as well as admins
drop policy if exists "Admins can manage team players" on public.team_players;
drop policy if exists "Admins can update team players" on public.team_players;
drop policy if exists "Admins can delete team players" on public.team_players;
drop policy if exists "Admins and trainers can insert team players" on public.team_players;
drop policy if exists "Admins and trainers can update team players" on public.team_players;
drop policy if exists "Admins and trainers can delete team players" on public.team_players;

create policy "Admins and trainers can insert team players"
  on public.team_players for insert
  to authenticated
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.is_club_admin(auth.uid(), t.club_id)
          or public.is_club_trainer(auth.uid(), t.club_id)
        )
    )
  );

create policy "Admins and trainers can update team players"
  on public.team_players for update
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.is_club_admin(auth.uid(), t.club_id)
          or public.is_club_trainer(auth.uid(), t.club_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.is_club_admin(auth.uid(), t.club_id)
          or public.is_club_trainer(auth.uid(), t.club_id)
        )
    )
  );

create policy "Admins and trainers can delete team players"
  on public.team_players for delete
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.is_club_admin(auth.uid(), t.club_id)
          or public.is_club_trainer(auth.uid(), t.club_id)
        )
    )
  );

-- team_coaches: club admins only (trainers may view, not reassign coaches)
drop policy if exists team_coaches_manage_trainer on public.team_coaches;
drop policy if exists team_coaches_manage_admin on public.team_coaches;

create policy team_coaches_manage_admin
  on public.team_coaches for all
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_coaches.team_id
        and public.is_club_admin(auth.uid(), t.club_id)
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_coaches.team_id
        and public.is_club_admin(auth.uid(), t.club_id)
    )
  );

-- teams UPDATE: trainers can edit team meta when assigning players (insert/delete stay admin-only)
drop policy if exists "Admins can update teams" on public.teams;
drop policy if exists "Admins and trainers can update teams" on public.teams;

create policy "Admins and trainers can update teams"
  on public.teams for update
  to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );
