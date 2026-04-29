# Section M go-live evidence

**Evidence index:** [PRODUCTION_READINESS_EVIDENCE_LOG.md](PRODUCTION_READINESS_EVIDENCE_LOG.md) (Phase 4).

Track completion of [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) Section M. Add evidence links per row (ticket URL, screenshot, or log path).


 RUN  v3.2.4 C:/Users/georg/ONE4Team_v2/ONE4Team_v2

stderr | src/test/rls.integration.test.ts > RLS tenant isolation (JWT against staging) > user A cannot read club B row by id
GoTrueClient@sb-qbtunzuztvnkerbdazjs-auth-token:1 (2.95.3) 2026-04-25T15:58:45.537Z Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.

stderr | src/test/rls.integration.test.ts > RLS tenant isolation (JWT against staging) > user A can read own club membership row
GoTrueClient@sb-qbtunzuztvnkerbdazjs-auth-token:2 (2.95.3) 2026-04-25T15:58:45.663Z Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.

stderr | src/test/rls.integration.test.ts > RLS tenant isolation (JWT against staging) > user A cannot update club B row (mutation probe)
GoTrueClient@sb-qbtunzuztvnkerbdazjs-auth-token:3 (2.95.3) 2026-04-25T15:58:45.743Z Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.

 ✓ src/test/rls.integration.test.ts (4 tests) 663ms
   ✓ RLS tenant isolation (JWT against staging) > user A cannot list memberships for club B  377ms
   ✓ RLS tenant isolation (JWT against staging) > user A cannot read club B row by id 126ms
   ✓ RLS tenant isolation (JWT against staging) > user A can read own club membership row 80ms
   ✓ RLS tenant isolation (JWT against staging) > user A cannot update club B row (mutation probe) 79ms

 Test Files  1 passed (1)      
      Tests  4 passed (4)      
   Start at  17:58:38
   Duration  8.41s (transform 43ms, setup 125ms, collect 66ms, tests 663ms, environment 771ms, prepare 118ms)

PS C:\Users\georg\ONE4Team_v2\ONE4Team_v2>

**Execution order:** Complete Phase B (rows 1–3) → Phase A on staging (rows 4–5, 7) → Phase C (row 8) → rollback rehearsal (row 9) → production deploy + smoke (row 10). See [PHASE_A_STAGING_RUNBOOK.md](PHASE_A_STAGING_RUNBOOK.md), [PHASE_B_SECRETS_CHECKLIST.md](PHASE_B_SECRETS_CHECKLIST.md), [PHASE_C_SECTION_L_EVIDENCE.md](PHASE_C_SECTION_L_EVIDENCE.md).

| # | Criterion | Done | Evidence |
|---|-----------|------|----------|
| 1 | Client env: only `VITE_SUPABASE_URL` and publishable key | ☐ | [PHASE_B_SECRETS_CHECKLIST.md](PHASE_B_SECRETS_CHECKLIST.md) B1 |
| 2 | Edge secrets and Stripe secrets set | ☐ | [PHASE_B_SECRETS_CHECKLIST.md](PHASE_B_SECRETS_CHECKLIST.md) B2 |
| 3 | `EDGE_ALLOWED_ORIGINS` non-wildcard in prod | ☐ | [PHASE_B_SECRETS_CHECKLIST.md](PHASE_B_SECRETS_CHECKLIST.md) B3 |
| 4 | Migrations applied; schema matches repo | ☐ | [PHASE_A_STAGING_RUNBOOK.md](PHASE_A_STAGING_RUNBOOK.md) A1 (staging prod) |
| 5 | RLS tests green on target env | ☐ | [PHASE_A_STAGING_RUNBOOK.md](PHASE_A_STAGING_RUNBOOK.md) A2 |
| 6 | Dev bypass flags off; guardrails passed | ☐ | CI `npm run guardrails` (NODE_ENV=production); Vite env audit |
| 7 | k6 smoke and staged runs meet SLOs | ☐ | [PHASE_A_STAGING_RUNBOOK.md](PHASE_A_STAGING_RUNBOOK.md) A5 |
| 8 | Dashboards and paging alerts (see SECTION_L_MONITORING_SETUP) | ☐ | [PHASE_C_SECTION_L_EVIDENCE.md](PHASE_C_SECTION_L_EVIDENCE.md) (after Phase C) |
| 9 | Rollback rehearsed | ☐ | [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) Section N + owner notes |
| 10 | Post-deploy smoke passed | ☐ | Core journeys / release checklist |

Sign-off: name, date.
