# ONE4Team — PHASE 4 INDEX (Manual dues tracking)

Goal: admin value without Stripe complexity.

Deliverables:
- membership dues table + RLS
- Dues page (admin manage + export)
- member can view own dues

---

## Supabase bundle + checklist
- SQL bundle: `supabase/APPLY_BUNDLE_PHASE4.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE4.md`

Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
4) `supabase/APPLY_BUNDLE_PHASE2.sql`
5) `supabase/APPLY_BUNDLE_PHASE3.sql`
6) `supabase/APPLY_BUNDLE_PHASE4.sql`

---

## App implementation
- Dues page: `src/pages/Dues.tsx`

---

## Phase 4 exit criteria: PASS (local readiness)
- Bundle + checklist present ✅
- Route + nav entry exist ✅
- `npm run lint` / `npm test` / `npm run build` ✅
- `npm run audit:phase0` ✅
