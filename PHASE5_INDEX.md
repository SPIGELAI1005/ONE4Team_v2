# ONE4Team — PHASE 5 INDEX (Partner portal stub)

Goal: reserve the second half of the vision without scope explosion.

Deliverables:
- partners data model
- placeholder screens + nav

---

## Supabase bundle + checklist
- SQL bundle: `supabase/APPLY_BUNDLE_PHASE5.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE5.md`

Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
4) `supabase/APPLY_BUNDLE_PHASE2.sql`
5) `supabase/APPLY_BUNDLE_PHASE3.sql`
6) `supabase/APPLY_BUNDLE_PHASE4.sql`
7) `supabase/APPLY_BUNDLE_PHASE5.sql`

---

## App implementation
- Partners page: `src/pages/Partners.tsx`

---

## Phase 5 exit criteria: PASS (local readiness)
- Bundle + checklist present ✅
- Route + nav entry exist ✅
- `npm run lint` / `npm test` / `npm run build` ✅
- `npm run audit:phase0` ✅
