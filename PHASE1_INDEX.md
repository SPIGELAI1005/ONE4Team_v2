# ONE4Team — PHASE 1 INDEX (Invite-only onboarding)

Goal: acquisition funnel without breaking tenant isolation.

Phase 1 delivers:
- Admin-created invites (hashed tokens)
- Public “request invite” funnel via RPC (rate limited)
- Invite redemption via RPC (validates hash + expiry + optional email lock)

---

## Supabase bundle + checklist
- SQL bundle: `supabase/APPLY_BUNDLE_PHASE1.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE1.md`

Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`

---

## UI flows (already implemented in repo)

### Public: Club Page → Request Invite
- Page: `src/pages/ClubPage.tsx`
- Action: calls RPC `request_club_invite(_club_id,_name,_email,_message)`

### Admin: Members → Invites
- Page: `src/pages/Members.tsx`
- Features:
  - view invite requests
  - create invite (client generates token; stores only token hash)
  - revoke unused invite

### New member: Onboarding → Redeem invite
- Page: `src/pages/Onboarding.tsx`
- Link format: `/onboarding?invite=<token>&club=<clubSlug>`
- Action: calls RPC `redeem_club_invite(_token)`

---

## Notes / gotchas
- RLS policies must call `is_club_admin(auth.uid(), club_id)` (uuid, uuid). Avoid legacy casts.
- The raw invite token must only be shown once (client-side) and never stored in DB.
- The current Admin invite creation UI generates token hashes **client-side**. Phase 1 RPCs assume SHA-256 hex hashing (`encode(digest(token,'sha256'),'hex')`).

---

## Phase 1 exit criteria (local readiness)
- Phase 1 SQL bundle uses correct policy helper calls (`is_club_admin(auth.uid(), club_id)`) ✅
- Apply order documented (baseline → phase1 → phase0) ✅
- UI flows exist:
  - request invite (ClubPage) ✅
  - admin create/revoke (Members → Invites) ✅
  - redeem invite (Onboarding) ✅

---

## Phase 1 exit criteria: PASS (local readiness)
All Phase 1 assets are prepared locally (bundle + docs + smoke script). Remaining validation requires applying SQL in Supabase.

## Smoke test script (run after applying SQL in Supabase)
Admin:
1) Sign in as admin
2) Members → Invites
3) Create invite
4) Copy link/token
5) Revoke unused invite (optional)

Public/new user:
1) Open club page → Request Invite (public club)
2) Admin approves/rejects request in Members → Invites
3) Open invite link: `/onboarding?invite=...&club=...`
4) Sign in and redeem → routes to `/dashboard/<role>`

Expected:
- `club_invites.used_at` set on redeem
- membership exists for the invited user
- request inserts only via `request_club_invite` RPC

## Next tightening (after Phase 1)
- Add email verification enforcement for invites (optional): if invite has email set, require matching authenticated email.
- Add audit log entries for invite redemption + approvals.
