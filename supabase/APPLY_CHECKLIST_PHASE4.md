# Phase 4 Apply Checklist (Manual dues tracking)

## Goal
Enable manual dues tracking (no Stripe):
- admins can mark dues as due/paid/waived
- members can view their own dues
- export CSV from the UI

## Files
- `supabase/APPLY_BUNDLE_PHASE4.sql`

## Steps (Supabase Dashboard)
1) Supabase → **SQL Editor**
2) Paste and run `supabase/APPLY_BUNDLE_PHASE4.sql`
3) Confirm there are no errors.

## Smoke test (after apply)
Admin/trainer:
1) Open **Dues** page
2) Create a dues entry for a member (due date + amount)
3) Mark it **paid** and add a note
4) Export CSV

Member:
1) Open **Dues** page
2) Confirm they can see only their own dues

Expected:
- Admin/trainer can manage dues for their club
- Members cannot see other members’ dues
