# Phase 0 — Apply checklist (RLS hardening)

This checklist goes with `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`.

## What this bundle changes
- Adds `public.is_club_trainer(user_id, club_id)` helper (trainer OR admin).
- Tightens write permissions so **trainers/admins** can manage:
  - `teams`, `training_sessions`, `events`, `event_participants` (invite/delete),
  - `competitions`, `matches`, `match_lineups`, `match_events`
- Adds additional safety on `notifications`: user must be a member of the club.

## Before you apply
- Ensure your baseline migrations are already applied (tables exist).
- Make sure you have at least 2 clubs + memberships to test.

## Apply steps (Supabase Dashboard)
1) Open **SQL Editor** in Supabase.
2) Paste the full contents of `APPLY_BUNDLE_PHASE0_RLS.sql`.
3) Run it.
4) Confirm: no errors.

## Smoke tests (must pass)

### A) Member read isolation
1) Sign in as a member in Club A and verify:
   - Teams/Events/Matches lists load only Club A data.
2) Switch active club to Club B:
   - lists load only Club B data.

### B) Trainer/Admin writes
As **trainer** in a club:
- Create a team
- Create a training session
- Create an event
- Create a match + competition
- Add lineup + match events
Expected: all succeed.

### C) Player restrictions
As **player/member** in a club:
- Attempt to create team/session/event/match
Expected: DB rejects (permission denied / RLS violation).

### D) RSVP correctness
As **player/member**:
- RSVP for an event you’re invited to
Expected: update succeeds.

Try to RSVP using another membership id (if you attempt via console):
Expected: RLS blocks.

### E) Notifications
As a normal user:
- You can read/update/delete your own notifications **only** for clubs you belong to.

## If something breaks
- Copy the exact Supabase error message.
- Tell me which role you used (admin/trainer/player) and which action.

## Known limitations (for Phase 1+)
- We still recommend moving some sensitive writes to RPCs (SECURITY DEFINER) for clearer audit + business rules.
- Some existing policies from earlier migrations remain as-is unless explicitly replaced.
