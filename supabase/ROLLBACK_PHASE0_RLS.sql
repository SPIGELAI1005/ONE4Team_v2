-- ONE4Team — Rollback Phase 0 RLS hardening
--
-- Reverts the policy changes made by APPLY_BUNDLE_PHASE0_RLS.sql
-- by recreating the baseline policies from migrations.
--
-- Apply in Supabase SQL Editor.

begin;

-- Helper function rollback: optional, keep function but revoke grants if you want.
-- (We leave is_club_trainer in place because dropping may break dependent policies.)

-- -------------------------------------------------------------
-- TEAMS (baseline: admin-only manage)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can insert teams" on public.teams;
drop policy if exists "Trainers/admins can update teams" on public.teams;
drop policy if exists "Trainers/admins can delete teams" on public.teams;

create policy "Admins can manage teams" on public.teams for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id));
create policy "Admins can update teams" on public.teams for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id));
create policy "Admins can delete teams" on public.teams for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

-- -------------------------------------------------------------
-- TRAINING SESSIONS (baseline)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can create sessions" on public.training_sessions;
drop policy if exists "Trainers/admins can update sessions" on public.training_sessions;
drop policy if exists "Trainers/admins can delete sessions" on public.training_sessions;

create policy "Admins/trainers can create sessions" on public.training_sessions for insert to authenticated
  with check (public.is_member_of_club(auth.uid(), club_id));
create policy "Admins can update sessions" on public.training_sessions for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id) or created_by = auth.uid());
create policy "Admins can delete sessions" on public.training_sessions for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

-- -------------------------------------------------------------
-- EVENTS (baseline: admin-only manage)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can create events" on public.events;
drop policy if exists "Trainers/admins can update events" on public.events;
drop policy if exists "Trainers/admins can delete events" on public.events;

create policy "Admins can create events" on public.events for insert
  with check (is_club_admin(auth.uid(), club_id) and created_by = auth.uid());
create policy "Admins can update events" on public.events for update
  using (is_club_admin(auth.uid(), club_id));
create policy "Admins can delete events" on public.events for delete
  using (is_club_admin(auth.uid(), club_id));

-- -------------------------------------------------------------
-- EVENT PARTICIPANTS (baseline)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can invite participants" on public.event_participants;
drop policy if exists "Users can RSVP for own membership (same club)" on public.event_participants;
drop policy if exists "Trainers/admins can delete participants" on public.event_participants;

create policy "Admins can manage participants" on public.event_participants for insert
  with check (exists (select 1 from events e where e.id = event_id and is_club_admin(auth.uid(), e.club_id)));
create policy "Members can update own participation" on public.event_participants for update
  using (exists (select 1 from club_memberships cm where cm.id = membership_id and cm.user_id = auth.uid()));
create policy "Admins can delete participants" on public.event_participants for delete
  using (exists (select 1 from events e where e.id = event_id and is_club_admin(auth.uid(), e.club_id)));

-- -------------------------------------------------------------
-- COMPETITIONS (baseline: admin-only manage)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can create competitions" on public.competitions;
drop policy if exists "Trainers/admins can update competitions" on public.competitions;
drop policy if exists "Trainers/admins can delete competitions" on public.competitions;

create policy "Admins can create competitions" on public.competitions for insert
  with check (is_club_admin(auth.uid(), club_id));
create policy "Admins can update competitions" on public.competitions for update
  using (is_club_admin(auth.uid(), club_id));
create policy "Admins can delete competitions" on public.competitions for delete
  using (is_club_admin(auth.uid(), club_id));

-- -------------------------------------------------------------
-- MATCHES (baseline: admin-only manage)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can create matches" on public.matches;
drop policy if exists "Trainers/admins can update matches" on public.matches;
drop policy if exists "Trainers/admins can delete matches" on public.matches;

create policy "Admins can create matches" on public.matches for insert
  with check (is_club_admin(auth.uid(), club_id));
create policy "Admins can update matches" on public.matches for update
  using (is_club_admin(auth.uid(), club_id));
create policy "Admins can delete matches" on public.matches for delete
  using (is_club_admin(auth.uid(), club_id));

-- -------------------------------------------------------------
-- MATCH LINEUPS (baseline: admin-only manage)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can insert lineups" on public.match_lineups;
drop policy if exists "Trainers/admins can update lineups" on public.match_lineups;
drop policy if exists "Trainers/admins can delete lineups" on public.match_lineups;

create policy "Admins can manage lineups" on public.match_lineups for insert
  with check (exists (select 1 from matches m where m.id = match_id and is_club_admin(auth.uid(), m.club_id)));
create policy "Admins can update lineups" on public.match_lineups for update
  using (exists (select 1 from matches m where m.id = match_id and is_club_admin(auth.uid(), m.club_id)));
create policy "Admins can delete lineups" on public.match_lineups for delete
  using (exists (select 1 from matches m where m.id = match_id and is_club_admin(auth.uid(), m.club_id)));

-- -------------------------------------------------------------
-- MATCH EVENTS (baseline: admin-only manage)
-- -------------------------------------------------------------
drop policy if exists "Trainers/admins can insert match events" on public.match_events;
drop policy if exists "Trainers/admins can update match events" on public.match_events;
drop policy if exists "Trainers/admins can delete match events" on public.match_events;

create policy "Admins can create match events" on public.match_events for insert
  with check (exists (select 1 from matches m where m.id = match_id and is_club_admin(auth.uid(), m.club_id)));
create policy "Admins can update match events" on public.match_events for update
  using (exists (select 1 from matches m where m.id = match_id and is_club_admin(auth.uid(), m.club_id)));
create policy "Admins can delete match events" on public.match_events for delete
  using (exists (select 1 from matches m where m.id = match_id and is_club_admin(auth.uid(), m.club_id)));

-- -------------------------------------------------------------
-- ANNOUNCEMENTS (baseline: author can update)
-- -------------------------------------------------------------
drop policy if exists "Admins can update announcements" on public.announcements;
-- keep baseline create policy name
-- ensure baseline create/delete/update exist

create policy "Authors can update announcements" on public.announcements for update to authenticated
  using (author_id = auth.uid());

-- -------------------------------------------------------------
-- MATCH VOTES (baseline)
-- -------------------------------------------------------------
drop policy if exists "Members can vote (own membership, same club/match)" on public.match_votes;

create policy "Members can vote in their club" on public.match_votes
  for insert with check (is_member_of_club(auth.uid(), club_id));

-- -------------------------------------------------------------
-- NOTIFICATIONS (baseline: no membership check)
-- -------------------------------------------------------------
drop policy if exists "Users can view their own notifications (in club)" on public.notifications;
drop policy if exists "Users can update their own notifications (in club)" on public.notifications;
drop policy if exists "Users can delete their own notifications (in club)" on public.notifications;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

commit;
