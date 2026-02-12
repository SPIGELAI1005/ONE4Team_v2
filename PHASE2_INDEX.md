# ONE4Team — PHASE 2 INDEX (Scheduling engine)

Goal: unify scheduling into one model:
- `activities` (training/match/event)
- `activity_attendance` (RSVP + attendance)

---

## Supabase bundle + checklist
- SQL bundle: `supabase/APPLY_BUNDLE_PHASE2.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE2.md`

Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
4) `supabase/APPLY_BUNDLE_PHASE2.sql`

---

## App implementation
- Page: `/activities` (Phase 2 schedule list + RSVP)
- Hook: `useMembershipId` (maps current user + active club → membership id)

---

## Phase 2 exit criteria (local readiness)
- Phase 2 bundle + checklist present ✅
- App route `/activities` exists ✅
- Phase 0 audits still pass ✅

---

## Phase 2 exit criteria: PASS (local readiness)
- Phase 2 bundle + checklist present ✅
- App route `/activities` exists ✅
- Nav includes Schedule → `/activities` ✅
- `npm run lint` / `npm test` / `npm run build` ✅
- `npm run audit:phase0` ✅
