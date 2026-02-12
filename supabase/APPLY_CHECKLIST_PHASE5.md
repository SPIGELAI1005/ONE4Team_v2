# Phase 5 Apply Checklist (Partner portal stub)

## Goal
Create the partners module skeleton:
- `partners` table + RLS
- placeholder UI + nav entry

## Files
- `supabase/APPLY_BUNDLE_PHASE5.sql`

## Steps (Supabase Dashboard)
1) Supabase → **SQL Editor**
2) Paste and run `supabase/APPLY_BUNDLE_PHASE5.sql`
3) Confirm there are no errors.

## Smoke test (after apply)
Admin/trainer:
1) Open **Partners** page
2) Create a partner entry
3) Confirm it shows in list

Member:
1) Open **Partners** page
2) Confirm read-only access

Expected:
- All reads are club-scoped
- Only trainer/admin can create/update/delete
