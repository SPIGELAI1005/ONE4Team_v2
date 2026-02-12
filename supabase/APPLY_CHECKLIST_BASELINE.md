# Baseline — Apply checklist (ONE4Team)

This checklist goes with `supabase/APPLY_BUNDLE_BASELINE.sql`.

## Goal
Create the minimum schema + helpers needed to run the app and then apply:
- Phase 1 (invite-only onboarding)
- Phase 0 hardening (RLS tightening)

## Apply steps (Supabase Dashboard)
1) Supabase Dashboard → **SQL Editor**
2) Paste + run: `supabase/APPLY_BUNDLE_BASELINE.sql`
3) Confirm: no errors

## Verify objects exist
Tables:
- `clubs`
- `profiles`
- `club_memberships`

Functions:
- `is_member_of_club(uuid, uuid)`
- `is_club_admin(uuid, uuid)`
- `update_updated_at()`
- `handle_new_user()` + trigger `on_auth_user_created`
- `create_club_with_admin(text, text, text, boolean)`

## Smoke checks (quick)
- Create an account → profile row auto-created.
- As authenticated user: can insert into `clubs`.
- As admin (membership role): can add/update/remove members.

## Next steps
- Apply Phase 1 bundle:
  - `supabase/APPLY_BUNDLE_PHASE1.sql`
  - `supabase/APPLY_CHECKLIST_PHASE1.md`

- Then apply Phase 0 hardening:
  - `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
  - `supabase/APPLY_CHECKLIST_PHASE0_RLS.md`
  - rollback: `supabase/ROLLBACK_PHASE0_RLS.sql`
