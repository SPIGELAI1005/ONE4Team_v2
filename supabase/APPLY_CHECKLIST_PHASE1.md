# Phase 1 Apply Checklist (Invites)

## Goal
Enable invite-only onboarding with:
- Admin-created invites (hashed tokens)
- Public invite request funnel (RPC-only, rate limited)
- Invite redemption (RPC, verifies hash + expiry + optional email lock)

## Files
- `supabase/APPLY_BUNDLE_PHASE1.sql`

## Steps (Supabase Dashboard)
1. Open **Supabase → SQL Editor**
2. Paste and run `supabase/APPLY_BUNDLE_PHASE1.sql`
3. Confirm there are no errors.

## Smoke test
### Admin
1. Sign in as admin
2. Go to **Members → Invites**
3. Create an invite token + copy invite link
4. (Optional) Revoke an unused invite

### Public / new member
1. Open invite link: `/onboarding?invite=...&club=...`
2. Sign in (or sign up)
3. Redeem → should route to dashboard

## Expected DB effects
- `club_invites.used_at` set after redemption
- `club_memberships` row exists for the invited user
- `club_invite_requests` inserts only via `request_club_invite` RPC

## Notes
- If you previously applied older migrations individually, running the bundle is safe (uses `if not exists` / `create or replace` / `drop policy if exists`).
