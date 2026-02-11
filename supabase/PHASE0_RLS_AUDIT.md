# Phase 0 — RLS audit matrix (DB enforcement)

This matrix describes the **intended database-level permissions** after applying:
- `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`

Legend:
- ✅ allowed
- ❌ denied
- 🔒 allowed only for *own record* (self)

Roles:
- **Admin** = club admin
- **Trainer** = trainer or admin
- **Member** = any active club member (player/member/etc.)

> Note: membership checks rely on helper functions from baseline migrations:
> - `public.is_member_of_club(auth.uid(), club_id)`
> - `public.is_club_admin(auth.uid(), club_id)`
> - plus `public.is_club_trainer(auth.uid(), club_id)` (added in bundle)

---

## clubs
- Select: ✅ public clubs; ✅ members for their clubs
- Insert: (baseline) authenticated users can create (check your existing policies)
- Update/Delete: 🔒 admin-only (per-club)

## club_memberships
- Select: 🔒 own memberships; ✅ admins can view all in club
- Insert/Update/Delete: ✅ admin-only

## teams
- Select: ✅ members
- Insert/Update/Delete: ✅ trainer/admin

## training_sessions
- Select: ✅ members
- Insert/Update/Delete: ✅ trainer/admin

## events
- Select: ✅ members
- Insert/Update/Delete: ✅ trainer/admin

## event_participants
- Select: ✅ members (via join to event.club_id)
- Insert: ✅ trainer/admin (invite)
- Update: 🔒 member can RSVP for own membership **only if membership.club_id == event.club_id**
- Delete: ✅ trainer/admin

## competitions
- Select: ✅ members
- Insert/Update/Delete: ✅ trainer/admin

## matches
- Select: ✅ members
- Insert/Update/Delete: ✅ trainer/admin

## match_lineups
- Select: ✅ members (via join to match.club_id)
- Insert/Update/Delete: ✅ trainer/admin (via join to match.club_id)

## match_events
- Select: ✅ members (via join to match.club_id)
- Insert/Update/Delete: ✅ trainer/admin (via join to match.club_id)

## match_votes
- Select: ✅ members (club scoped)
- Insert: 🔒 must be member AND `voter_membership_id` belongs to auth user AND match.club_id matches AND voted_for membership is in same club
- Update/Delete: 🔒 only own vote (by voter_membership_id → auth user)

## announcements
- Select: ✅ members
- Insert/Update/Delete: ✅ admin-only

## messages
- Select: ✅ members
- Insert: 🔒 member-only, must be sender

## notifications
- Select/Update/Delete: 🔒 own notifications AND must be a member of that `club_id`
- Insert: ✅ admin-only

## payments + membership_fee_types
- Select:
  - payments: 🔒 own OR ✅ admin for club
  - fee types: ✅ members
- Insert/Update/Delete: ✅ admin-only

## achievements / stats / awards
- Select: ✅ members (club scoped)
- Insert/Update/Delete: ✅ admin-only (per baseline migrations)

---

## Open items / future hardening
- Consider aligning `team_players` management to trainer/admin (currently admin-only in baseline).
- Consider RPCs for:
  - bulk notifications
  - payments generation
  - invite approval workflows
