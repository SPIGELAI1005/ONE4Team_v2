# ONE4Team — TASKS

Legend: **NOW** / NEXT / BLOCKED / DONE

This file is the execution queue derived from `MVP_PLAN.md`, `ROADMAP.md`, and Phase 0 artifacts.

---

## NOW (top priority)

### P0-001 Project index + execution hygiene
- [x] **P0-001a** Create `PHASE0_INDEX.md` linking all Phase 0 artifacts (audits, RLS bundles, apply order, rollback, checklists).
- [x] **P0-001b** Keep `TASKS.md` updated as source-of-truth for what’s next.

### P0-010 Tenant isolation: active club context (app)
- [x] **P0-010a** Locate current “active club” mechanism (storage key, context/provider) and document it in `PHASE0_INDEX.md`.
- [x] **P0-010b** Implement/confirm **Active Club selector UI** and persistence (localStorage + user settings if present).
- [x] **P0-010c** Add a guardrail: any data-fetch hook must require an active `clubId` and return empty/loading without it.

### P0-020 Code audit: scoping correctness
- [x] **P0-020a** Audit codebase for Supabase reads/writes and ensure scoping by `club_id` (or parent key) is consistently enforced (baseline scan added: `scripts/list-supabase-tables-used.ps1`).
- [x] **P0-020b** Re-run `npm run audit:phase0` and fix any findings (currently OK).

### P0-030 Database: schema + RLS baseline
- [x] **P0-030a** Consolidate baseline schema into a clean Supabase apply bundle (see `supabase/APPLY_BUNDLE_BASELINE.sql`).
- [x] **P0-030b** Validate/align `supabase/MVP_SCHEMA_RLS.sql` with existing bundles + migrations: keep it explicitly as **DRAFT/REFERENCE** and document missing tables in `supabase/SCHEMA_STATUS.md`.
- [x] **P0-030c** Add a “seed/dev helper” to create first club + admin membership for the logged-in user (included in baseline bundle as `create_club_with_admin`).

### P0-040 RBAC baseline
- [x] **P0-040a** Define roles + permissions mapping (code map: `src/lib/permissions.ts`).
- [x] **P0-040b** Implement `hasPermission()` helper used by nav + actions (`usePermissions`).
- [x] **P0-040c** Enforce permissions server-side (RLS bundles Phase 0/1/2 + audits).

---

## NEXT (once Phase 0 is stable)

### P1-010 Invite-only onboarding
- [x] **P1-010a** Ensure Phase 1 bundles are correct and documented: `supabase/APPLY_BUNDLE_PHASE1.sql` + checklist (fixed policy arg types; added `PHASE1_INDEX.md`).
- [x] **P1-010b** Implement admin invite creation UI + copy-link flow (see `src/pages/Members.tsx`).
- [x] **P1-010c** Implement invite acceptance flow → membership activation (see `src/pages/Onboarding.tsx` + RPC `redeem_club_invite`).
- [x] **P1-010d** Implement public “request invite” form on club page (see `src/pages/ClubPage.tsx` + RPC `request_club_invite`).
- [x] **P1-010e** Implement admin inbox for invite requests (see `src/pages/Members.tsx`).

### P1-020 Phase 1 closure (local readiness)
- [x] **P1-020a** Add Phase 1 exit criteria section to `PHASE1_INDEX.md` (bundle OK, flows exist, apply order documented).
- [x] **P1-020b** Add Phase 1 “smoke script” doc for manual testing after applying SQL (admin create/revoke; public request; redeem).
- [x] **P1-020c** Ensure no legacy `is_club_admin(...::text)` calls remain in SQL bundles (search + assert).

### P2-010 Scheduling engine
- [x] **P2-010a** Add `activities` table (training/match/event) + RLS (`supabase/APPLY_BUNDLE_PHASE2.sql`).
- [x] **P2-010b** Add `activity_attendance` + RLS (`supabase/APPLY_BUNDLE_PHASE2.sql`).
- [x] **P2-010c** Implement activities list/create + RSVP UI (`src/pages/Activities.tsx`).

### P2-020 Phase 2 closure (local readiness)
- [x] **P2-020a** Add `PHASE2_INDEX.md` with apply order + exit criteria.
- [x] **P2-020b** Add Phase 2 apply checklist (`supabase/APPLY_CHECKLIST_PHASE2.md`).
- [x] **P2-020c** Ensure Phase 0 audits include the new tables (writes/selects).

### P3-010 Matches + football stats
- [x] **P3-010a** Create Phase 3 apply bundle (`supabase/APPLY_BUNDLE_PHASE3.sql`) + checklist.
- [x] **P3-010b** Add `PHASE3_INDEX.md`.
- [x] **P3-010c** Confirm Phase 3 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P4-010 Manual dues tracking
- [x] **P4-010a** Create Phase 4 apply bundle (`supabase/APPLY_BUNDLE_PHASE4.sql`) + checklist.
- [x] **P4-010b** Add `PHASE4_INDEX.md`.
- [x] **P4-010c** Add Dues page + route + nav.
- [x] **P4-010d** Confirm Phase 4 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P5-010 Partner portal stub
- [x] **P5-010a** Create Phase 5 apply bundle (`supabase/APPLY_BUNDLE_PHASE5.sql`) + checklist.
- [x] **P5-010b** Add `PHASE5_INDEX.md`.
- [x] **P5-010c** Add Partners placeholder page + route + nav.
- [x] **P5-010d** Confirm Phase 5 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P6-010 AI copilots v1
- [x] **P6-010a** Create Phase 6 apply bundle (`supabase/APPLY_BUNDLE_PHASE6.sql`) + checklist.
- [x] **P6-010b** Add `PHASE6_INDEX.md`.
- [x] **P6-010c** Add AI hub page (Co‑Trainer + Co‑AImin) with club-scoped logging.
- [x] **P6-010d** Confirm Phase 6 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P7-010 Production hardening (Supabase-independent)
- [x] **P7-010a** Add ErrorBoundary + minimal logger.
- [x] **P7-010b** Add Playwright E2E scaffold + smoke test.
- [x] **P7-010c** Wire e2e smoke into CI.
- [x] **P7-010d** Add deployment docs (`DEPLOYMENT.md`) and `PHASE7_INDEX.md`.

### P7-020 Production hardening (HOLD — needs Supabase)
- [ ] **P7-020a** Add invite-request rate limits / spam controls.
- [ ] **P7-020b** Staging + prod Supabase projects and env separation.
- [ ] **P7-020c** Tenant isolation verification on staging.

---

## QUALITY / DELIVERY
- [x] **Q-001** Add CI workflow: lint + test + build + `audit:phase0`.
- [ ] **Q-002** Add/extend Supabase apply checklists + rollback notes for the full Phase 0/1/2/3 set.

---

## BLOCKED
- **Applying Supabase bundles** requires you to run SQL in the Supabase Dashboard (unless we set up CLI/service access).
