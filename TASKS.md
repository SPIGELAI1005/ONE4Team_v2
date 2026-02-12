# ONE4Team — TASKS

Legend: **NOW** / NEXT / BLOCKED / DONE

This file is the execution queue derived from `MVP_PLAN.md`, `ROADMAP.md`, and Phase 0 artifacts.

---

## NOW (top priority)

### P0-001 Project index + execution hygiene
- [ ] **P0-001a** Create `PHASE0_INDEX.md` linking all Phase 0 artifacts (audits, RLS bundles, apply order, rollback, checklists).
- [ ] **P0-001b** Keep `TASKS.md` updated as source-of-truth for what’s next.

### P0-010 Tenant isolation: active club context (app)
- [ ] **P0-010a** Locate current “active club” mechanism (storage key, context/provider) and document it in `PHASE0_INDEX.md`.
- [ ] **P0-010b** Implement/confirm **Active Club selector UI** and persistence (localStorage + user settings if present).
- [ ] **P0-010c** Add a guardrail: any data-fetch hook must require an active `clubId` and return empty/loading without it.

### P0-020 Code audit: scoping correctness
- [x] **P0-020a** Audit codebase for Supabase reads/writes and ensure scoping by `club_id` (or parent key) is consistently enforced (baseline scan added: `scripts/list-supabase-tables-used.ps1`).
- [x] **P0-020b** Re-run `npm run audit:phase0` and fix any findings (currently OK).

### P0-030 Database: schema + RLS baseline
- [x] **P0-030a** Consolidate baseline schema into a clean Supabase apply bundle (see `supabase/APPLY_BUNDLE_BASELINE.sql`).
- [x] **P0-030b** Validate/align `supabase/MVP_SCHEMA_RLS.sql` with existing bundles + migrations: keep it explicitly as **DRAFT/REFERENCE** and document missing tables in `supabase/SCHEMA_STATUS.md`.
- [x] **P0-030c** Add a “seed/dev helper” to create first club + admin membership for the logged-in user (included in baseline bundle as `create_club_with_admin`).

### P0-040 RBAC baseline
- [ ] **P0-040a** Define roles + permissions mapping (admin/trainer/player/member/parent_fan/partner) and store it (DB seed or code map).
- [ ] **P0-040b** Implement `hasPermission()` helper used by nav + actions.
- [ ] **P0-040c** Enforce permissions server-side (RLS/RPC where feasible) for privileged writes.

---

## NEXT (once Phase 0 is stable)

### P1-010 Invite-only onboarding
- [x] **P1-010a** Ensure Phase 1 bundles are correct and documented: `supabase/APPLY_BUNDLE_PHASE1.sql` + checklist (fixed policy arg types; added `PHASE1_INDEX.md`).
- [x] **P1-010b** Implement admin invite creation UI + copy-link flow (see `src/pages/Members.tsx`).
- [x] **P1-010c** Implement invite acceptance flow → membership activation (see `src/pages/Onboarding.tsx` + RPC `redeem_club_invite`).
- [x] **P1-010d** Implement public “request invite” form on club page (see `src/pages/ClubPage.tsx` + RPC `request_club_invite`).
- [x] **P1-010e** Implement admin inbox for invite requests (see `src/pages/Members.tsx`).

### P1-020 Phase 1 closure (local readiness)
- [ ] **P1-020a** Add Phase 1 exit criteria section to `PHASE1_INDEX.md` (bundle OK, flows exist, apply order documented).
- [ ] **P1-020b** Add Phase 1 “smoke script” doc for manual testing after applying SQL (admin create/revoke; public request; redeem).
- [ ] **P1-020c** Ensure no legacy `is_club_admin(...::text)` calls remain in SQL bundles (search + assert).

### P2-010 Scheduling engine
- [ ] **P2-010a** Add `activities` table (training/match/event) + RLS.
- [ ] **P2-010b** Add `activity_attendance` + RLS.
- [ ] **P2-010c** Implement activities list/create + RSVP UI.

---

## QUALITY / DELIVERY
- [ ] **Q-001** Add CI workflow: lint + test + build + `audit:phase0`.
- [ ] **Q-002** Add/extend Supabase apply checklists + rollback notes for the full Phase 0/1 set.

---

## BLOCKED
- **Applying Supabase bundles** requires you to run SQL in the Supabase Dashboard (unless we set up CLI/service access).
