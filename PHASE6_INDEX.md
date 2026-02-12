# ONE4Team — PHASE 6 INDEX (AI copilots v1)

Goal: AI adds immediate operational value (workflow-first, club-scoped, logged).

Deliverables:
- `ai_requests` table for logging
- Co‑Trainer v1: weekly training plan
- Co‑AImin v1: admin digest
- Guardrails: always scoped to active `club_id`, show inputs used

---

## Supabase bundle + checklist
- SQL bundle: `supabase/APPLY_BUNDLE_PHASE6.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE6.md`

Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
4) `supabase/APPLY_BUNDLE_PHASE2.sql`
5) `supabase/APPLY_BUNDLE_PHASE3.sql`
6) `supabase/APPLY_BUNDLE_PHASE4.sql`
7) `supabase/APPLY_BUNDLE_PHASE5.sql`
8) `supabase/APPLY_BUNDLE_PHASE6.sql`

---

## App implementation
- AI hub page: `src/pages/AI.tsx`

---

## Phase 6 exit criteria: PASS (local readiness)
- Bundle + checklist present ✅
- Route + nav entry exist ✅
- `npm run lint` / `npm test` / `npm run build` ✅
- `npm run audit:phase0` ✅
