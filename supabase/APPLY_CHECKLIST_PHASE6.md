# Phase 6 Apply Checklist (AI copilots v1)

## Goal
Enable safe AI workflows (club-scoped + logged):
- `ai_requests` table + RLS
- Co‑Trainer weekly plan (stub generator in app for now)
- Co‑AImin admin digest (stub generator in app for now)

## Files
- `supabase/APPLY_BUNDLE_PHASE6.sql`

## Steps (Supabase Dashboard)
1) Supabase → **SQL Editor**
2) Paste and run `supabase/APPLY_BUNDLE_PHASE6.sql`
3) Confirm there are no errors.

## Smoke test (after apply)
1) Open **AI** page
2) Generate a weekly training plan
3) Generate an admin digest
4) Confirm rows appear in `ai_requests` and are club-scoped

Expected:
- Any user can create their own AI request rows for their club
- Trainers/admins can review all club AI requests
- Users cannot read other users’ AI requests from other clubs
