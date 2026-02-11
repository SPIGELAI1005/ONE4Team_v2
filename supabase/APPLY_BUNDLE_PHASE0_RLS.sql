-- ONE4Team — Phase 0 RLS hardening bundle
--
-- Intent: tighten tenant isolation + RBAC at the database layer.
-- Apply in Supabase SQL Editor.
-- Safe to re-run: uses CREATE OR REPLACE + DROP POLICY IF EXISTS.
--
-- NOTE: This bundle aligns DB rules with the app's Phase 0 model:
-- - Members can read club data.
-- - Trainers/Admins can manage sports ops (teams/sessions/events/matches).
-- - Admin-only for payments, fee types, notifications, announcements, invite management.
--
-- Assumes tables already exist (created by migrations).

begin;

-- -------------------------------------------------------------
-- 0) Helper: trainer check (admin OR trainer) for a club
-- -------------------------------------------------------------
create or replace function public.is_club_trainer(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships
    where user_id = _user_id
      and club_id = _club_id
      and status = 'active'
      and role in ('trainer'::public.app_role, 'admin'::public.app_role)
  );
$$;

grant execute on function public.is_club_trainer(uuid, uuid) to anon, authenticated;

-- -------------------------------------------------------------
-- 1) TEAMS — trainer/admin manage
-- -------------------------------------------------------------
-- Replace admin-only manage policies with trainer/admin.
drop policy if exists "Admins can manage teams" on public.teams;
drop policy if exists "Admins can update teams" on public.teams;
drop policy if exists "Admins can delete teams" on public.teams;

create policy "Trainers/admins can insert teams"
  on public.teams for insert to authenticated
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can update teams"
  on public.teams for update to authenticated
  using (public.is_club_trainer(auth.uid(), club_id))
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can delete teams"
  on public.teams for delete to authenticated
  using (public.is_club_trainer(auth.uid(), club_id));

-- -------------------------------------------------------------
-- 2) TRAINING SESSIONS — trainer/admin manage
-- -------------------------------------------------------------
drop policy if exists "Admins/trainers can create sessions" on public.training_sessions;
drop policy if exists "Admins can update sessions" on public.training_sessions;
drop policy if exists "Admins can delete sessions" on public.training_sessions;

create policy "Trainers/admins can create sessions"
  on public.training_sessions for insert to authenticated
  with check (public.is_club_trainer(auth.uid(), club_id) and created_by = auth.uid());

create policy "Trainers/admins can update sessions"
  on public.training_sessions for update to authenticated
  using (public.is_club_trainer(auth.uid(), club_id))
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can delete sessions"
  on public.training_sessions for delete to authenticated
  using (public.is_club_trainer(auth.uid(), club_id));

-- -------------------------------------------------------------
-- 3) EVENTS — trainer/admin manage
-- -------------------------------------------------------------
drop policy if exists "Admins can create events" on public.events;
drop policy if exists "Admins can update events" on public.events;
drop policy if exists "Admins can delete events" on public.events;

create policy "Trainers/admins can create events"
  on public.events for insert to authenticated
  with check (public.is_club_trainer(auth.uid(), club_id) and created_by = auth.uid());

create policy "Trainers/admins can update events"
  on public.events for update to authenticated
  using (public.is_club_trainer(auth.uid(), club_id))
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can delete events"
  on public.events for delete to authenticated
  using (public.is_club_trainer(auth.uid(), club_id));

-- -------------------------------------------------------------
-- 4) EVENT PARTICIPANTS
--    - trainers/admins can invite/manage
--    - users can RSVP only for their own membership AND within the same club
-- -------------------------------------------------------------
drop policy if exists "Admins can manage participants" on public.event_participants;
drop policy if exists "Members can update own participation" on public.event_participants;
drop policy if exists "Admins can delete participants" on public.event_participants;

create policy "Trainers/admins can invite participants"
  on public.event_participants for insert to authenticated
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_club_trainer(auth.uid(), e.club_id)
    )
  );

create policy "Users can RSVP for own membership (same club)"
  on public.event_participants for update to authenticated
  using (
    exists (
      select 1
      from public.club_memberships cm
      join public.events e on e.id = event_participants.event_id
      where cm.id = event_participants.membership_id
        and cm.user_id = auth.uid()
        and cm.club_id = e.club_id
    )
  )
  with check (
    exists (
      select 1
      from public.club_memberships cm
      join public.events e on e.id = event_participants.event_id
      where cm.id = event_participants.membership_id
        and cm.user_id = auth.uid()
        and cm.club_id = e.club_id
    )
  );

create policy "Trainers/admins can delete participants"
  on public.event_participants for delete to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_club_trainer(auth.uid(), e.club_id)
    )
  );

-- -------------------------------------------------------------
-- 5) COMPETITIONS — trainer/admin manage
-- -------------------------------------------------------------
drop policy if exists "Admins can create competitions" on public.competitions;
drop policy if exists "Admins can update competitions" on public.competitions;
drop policy if exists "Admins can delete competitions" on public.competitions;

create policy "Trainers/admins can create competitions"
  on public.competitions for insert to authenticated
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can update competitions"
  on public.competitions for update to authenticated
  using (public.is_club_trainer(auth.uid(), club_id))
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can delete competitions"
  on public.competitions for delete to authenticated
  using (public.is_club_trainer(auth.uid(), club_id));

-- -------------------------------------------------------------
-- 6) MATCHES — trainer/admin manage
-- -------------------------------------------------------------
drop policy if exists "Admins can create matches" on public.matches;
drop policy if exists "Admins can update matches" on public.matches;
drop policy if exists "Admins can delete matches" on public.matches;

create policy "Trainers/admins can create matches"
  on public.matches for insert to authenticated
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can update matches"
  on public.matches for update to authenticated
  using (public.is_club_trainer(auth.uid(), club_id))
  with check (public.is_club_trainer(auth.uid(), club_id));

create policy "Trainers/admins can delete matches"
  on public.matches for delete to authenticated
  using (public.is_club_trainer(auth.uid(), club_id));

-- -------------------------------------------------------------
-- 7) MATCH LINEUPS — trainer/admin manage
-- -------------------------------------------------------------
drop policy if exists "Admins can manage lineups" on public.match_lineups;
drop policy if exists "Admins can update lineups" on public.match_lineups;
drop policy if exists "Admins can delete lineups" on public.match_lineups;

create policy "Trainers/admins can insert lineups"
  on public.match_lineups for insert to authenticated
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  );

create policy "Trainers/admins can update lineups"
  on public.match_lineups for update to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  );

create policy "Trainers/admins can delete lineups"
  on public.match_lineups for delete to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  );

-- -------------------------------------------------------------
-- 8) MATCH EVENTS — trainer/admin manage
-- -------------------------------------------------------------
drop policy if exists "Admins can create match events" on public.match_events;
drop policy if exists "Admins can update match events" on public.match_events;
drop policy if exists "Admins can delete match events" on public.match_events;

create policy "Trainers/admins can insert match events"
  on public.match_events for insert to authenticated
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  );

create policy "Trainers/admins can update match events"
  on public.match_events for update to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  );

create policy "Trainers/admins can delete match events"
  on public.match_events for delete to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_club_trainer(auth.uid(), m.club_id)
    )
  );

-- -------------------------------------------------------------
-- 9) ANNOUNCEMENTS — admin-only write (matches app behavior)
-- -------------------------------------------------------------
drop policy if exists "Admins can create announcements" on public.announcements;
drop policy if exists "Authors can update announcements" on public.announcements;
drop policy if exists "Admins can delete announcements" on public.announcements;

create policy "Admins can create announcements"
  on public.announcements for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id) and author_id = auth.uid());

create policy "Admins can update announcements"
  on public.announcements for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

create policy "Admins can delete announcements"
  on public.announcements for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

-- -------------------------------------------------------------
-- 10) MATCH VOTES — tighten invariants
--   - voter_membership_id must belong to auth user
--   - vote must be within same club as match + memberships
-- -------------------------------------------------------------
drop policy if exists "Members can vote in their club" on public.match_votes;
drop policy if exists "Members can view votes in their club" on public.match_votes;
drop policy if exists "Members can update own vote" on public.match_votes;
drop policy if exists "Members can delete own vote" on public.match_votes;

create policy "Members can view votes in their club"
  on public.match_votes for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

create policy "Members can vote (own membership, same club/match)"
  on public.match_votes for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and exists (
      select 1
      from public.club_memberships cm
      where cm.id = match_votes.voter_membership_id
        and cm.user_id = auth.uid()
        and cm.club_id = match_votes.club_id
    )
    and exists (
      select 1
      from public.club_memberships cm2
      where cm2.id = match_votes.voted_for_membership_id
        and cm2.club_id = match_votes.club_id
    )
    and exists (
      select 1
      from public.matches m
      where m.id = match_votes.match_id
        and m.club_id = match_votes.club_id
    )
  );

create policy "Members can update own vote"
  on public.match_votes for update to authenticated
  using (
    exists (
      select 1
      from public.club_memberships cm
      where cm.id = match_votes.voter_membership_id
        and cm.user_id = auth.uid()
        and cm.club_id = match_votes.club_id
    )
  )
  with check (
    exists (
      select 1
      from public.club_memberships cm
      where cm.id = match_votes.voter_membership_id
        and cm.user_id = auth.uid()
        and cm.club_id = match_votes.club_id
    )
  );

create policy "Members can delete own vote"
  on public.match_votes for delete to authenticated
  using (
    exists (
      select 1
      from public.club_memberships cm
      where cm.id = match_votes.voter_membership_id
        and cm.user_id = auth.uid()
        and cm.club_id = match_votes.club_id
    )
  );

-- -------------------------------------------------------------
-- 11) NOTIFICATIONS — add club membership check for select/update/delete
-- -------------------------------------------------------------
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

create policy "Users can view their own notifications (in club)"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id));

create policy "Users can update their own notifications (in club)"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id))
  with check (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id));

create policy "Users can delete their own notifications (in club)"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id and public.is_member_of_club(auth.uid(), club_id));

commit;
