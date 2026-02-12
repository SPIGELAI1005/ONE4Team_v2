# ONE4Team — PHASE 0 INDEX (Foundation)

Purpose: make Phase 0 **tenant isolation + RBAC** a repeatable package.

If you’re about to deploy/apply Supabase changes: start here.

---

## What Phase 0 guarantees
- **Hard tenant boundaries**: no cross-club reads/writes.
- **RBAC correctness**: privileged writes require correct role + club context.
- **Realtime safety**: realtime subscriptions are filtered by tenant context.
- **Regression guardrails**: automated audits catch common scoping mistakes.

---

## Run locally (pre-flight)
From repo root:

- Install + basics:
  - `npm install`
  - `npm run lint`
  - `npm test`
  - `npm run build`

- Phase 0 automated audits:
  - `npm run audit:phase0`
    - runs `scripts/audit-realtime.cjs`
    - runs `scripts/audit-supabase-writes.cjs`
    - runs `scripts/audit-supabase-selects.cjs`
  - (optional) run directly:
    - `npm run audit:selects`

Artifacts:
- `scripts/audit-phase0.cjs`
- `scripts/audit-realtime.cjs`
- `scripts/audit-supabase-writes.cjs`

---

## Supabase apply bundles + order
Recommended order (see full guide):
- `supabase/APPLY_ORDER_GUIDE.md`

### Baseline (fresh Supabase project)
- SQL: `supabase/APPLY_BUNDLE_BASELINE.sql`
- Checklist: `supabase/APPLY_CHECKLIST_BASELINE.md`

### Phase 1 (invites) bundle
- SQL: `supabase/APPLY_BUNDLE_PHASE1.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE1.md`

### Phase 0 (RLS hardening) bundle
- SQL: `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
- Checklist: `supabase/APPLY_CHECKLIST_PHASE0_RLS.md`
- Rollback: `supabase/ROLLBACK_PHASE0_RLS.sql`

### MVP schema draft (older / broader)
- `supabase/MVP_SCHEMA_RLS.sql`

---

## Manual regression checklists
- RBAC checklist: `PHASE0_RBAC_CHECKLIST.md`
- Role + club switching regression: `PHASE0_ROLE_CLUB_SWITCH_REGRESSION.md`
- RLS audit notes: `supabase/PHASE0_RLS_AUDIT.md`

---

## Active club / role context (app)
- **Active club** must be the source-of-truth for scoping (`club_id` everywhere).
- **Route role** (e.g. `/dashboard/:role`) must never grant permissions by itself; membership role in the active club is source-of-truth.

TODO (tracked in `TASKS.md`):
- Document exact storage keys + provider locations once verified in code.

---

## CI guardrails (recommended)
Add a GitHub Actions workflow to run:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run audit:phase0`

(Tracked as **Q-001** in `TASKS.md`.)
