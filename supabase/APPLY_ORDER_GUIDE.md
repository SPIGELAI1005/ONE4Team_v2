# Supabase apply order guide (ONE4Team)

This repo contains **two “paste bundles”** you can apply later in Supabase SQL Editor:

- **Phase 1 invites bundle**: `supabase/APPLY_BUNDLE_PHASE1.sql`
  - invite tables + RPCs for redeem + request invite hardening

- **Phase 0 RLS hardening bundle**: `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
  - tightens RBAC/isolation policies (trainer/admin vs member)
  - tightens announcements + match_votes invariants

---

## Recommended apply order

### ✅ Option A (recommended): Phase 1 first, then Phase 0
1) Apply **Phase 1** bundle:
   - `APPLY_BUNDLE_PHASE1.sql`
2) Smoke test invite flow:
   - request → approve → create invite → redeem
3) Apply **Phase 0** bundle:
   - `APPLY_BUNDLE_PHASE0_RLS.sql`
4) Smoke test Phase 0 RBAC + isolation:
   - use `APPLY_CHECKLIST_PHASE0_RLS.md`

**Why this order?**
- Phase 1 introduces new objects (tables + RPCs) you’ll want working before tightening everything.
- Phase 0 hardening is mostly policy replacement; doing it last reduces “mystery failures” while validating the invite funnel.

---

## Conflicts / overlaps to be aware of

### 1) `pgcrypto`
Both Phase 1 and baseline schema may include `create extension if not exists pgcrypto;`.
- Safe to re-run.

### 2) Announcements policies
Phase 0 bundle makes **announcements admin-only update/delete**, which matches the current UI.
- If later you want “authors can edit their own announcements”, we’ll adjust policies.

### 3) Match votes policies
Phase 0 bundle tightens match_votes. This should be compatible with current MatchVoting usage.
- If you see RLS errors on voting after applying Phase 0, capture the error text and we’ll tune.

### 4) Invites policies
Phase 1 bundle covers invite flows (`club_invites`, `club_invite_requests`, redeem + request RPCs).
- Phase 0 bundle does **not** modify invite policies.

---

## Emergency rollback
If Phase 0 policies cause unexpected behavior:
- Apply `supabase/ROLLBACK_PHASE0_RLS.sql` to restore baseline policies for the touched objects.

---

## Practical “one sitting” plan
When you’re at the PC, the smoothest flow is:
1) Apply Phase 1 bundle → run Phase 1 smoke test.
2) Apply Phase 0 bundle → run Phase 0 smoke test.

This gives you clear attribution if something breaks.
