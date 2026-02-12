# Phase 2 Apply Checklist (Activities + Attendance)

## Goal
Enable the scheduling engine primitives:
- `activities` (training/match/event)
- `activity_attendance` (invited/confirmed/declined/attended)

## Files
- `supabase/APPLY_BUNDLE_PHASE2.sql`

## Steps (Supabase Dashboard)
1) Open **Supabase → SQL Editor**
2) Paste and run `supabase/APPLY_BUNDLE_PHASE2.sql`
3) Confirm there are no errors.

## Smoke test (after apply)
Trainer/admin:
1) Create an activity (type training/event/match)
2) Invite attendance row for a member (optional)

Member:
1) View activities list
2) RSVP (confirmed/declined)

Expected DB effects:
- `activities` row created with `club_id` + `created_by`
- `activity_attendance` row created/updated for the member

## Notes
- Uses `public.is_club_trainer(auth.uid(), club_id)` (from Phase 0 bundle). Apply Phase 0 before Phase 2.
