# Phase 3 Apply Checklist (Matches + Football Stats)

## Goal
Enable match operations and stats:
- competitions + matches
- lineups + match events
- player of the match voting
- player stats + stat definitions + season awards

## Files
- `supabase/APPLY_BUNDLE_PHASE3.sql`

## Steps (Supabase Dashboard)
1) Open **Supabase → SQL Editor**
2) Paste and run `supabase/APPLY_BUNDLE_PHASE3.sql`
3) Confirm there are no errors.

## Smoke test (after apply)
Trainer/admin:
1) Create competition
2) Create match
3) Add lineup
4) Add match event (goal/card/sub)

Member:
1) View matches list
2) Vote player of the match
3) View player stats leaderboard

Expected:
- Reads are club-scoped
- Writes are allowed only for trainers/admins after Phase 0 hardening bundle is applied

## Notes
- Base policies here are admin-only for writes; Phase 0 hardening bundle expands sports ops writes to trainers/admins.
