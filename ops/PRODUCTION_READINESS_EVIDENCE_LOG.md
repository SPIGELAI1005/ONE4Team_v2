# Production readiness — consolidated evidence log

Single index for [PRODUCTION_READINESS_COMPLETION_PLAN.md](PRODUCTION_READINESS_COMPLETION_PLAN.md). Link tickets, screenshots, or CI logs in the **Evidence** column as you complete each step.

## Repo / CI (automatable)

| Check | Command / artifact | Status | Evidence |
|-------|-------------------|--------|----------|
| Production guardrails | `NODE_ENV=production npm run guardrails` | Done 2026-03-29 | Local run: exit 0 |
| Unit tests | `npm test -- --run` | Done 2026-03-29 | Vitest: example + telemetry passed; RLS suite skipped without `RLS_TEST_*` |
| Bundle budget | `npm run build && npm run budget:bundle` | Done 2026-03-29 | `assert-bundle-budget: OK` (local) |
| Policy drift (optional) | `PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt npm run policies:drift` | Pending snapshot file | Generate snapshot per [PG_POLICIES_SNAPSHOT.md](PG_POLICIES_SNAPSHOT.md) |

## Phase 1 — Staging: DB + proof + load

| Step | Action | Status | Evidence |
|------|--------|--------|----------|
| 1.1 | Apply migrations 32–42 on **staging** | Pending operator | Supabase migration list + `supabase migration list` or dashboard |
| 1.2 | RLS JWT tests with `RLS_TEST_*` | Pending env | Output of `npm test` with env set; or CI secret |
| 1.3 | Optional `policies:drift` | Pending | Log excerpt |
| 1.4 | EXPLAIN snapshots (hotspot queries) | Pending | [EXPLAIN_EVIDENCE_TEMPLATE.md](EXPLAIN_EVIDENCE_TEMPLATE.md) + ticket |
| 1.5 | k6 smoke, journeys, staged-reads vs **staging** URLs | Pending | k6 stdout + [PHASE_A_STAGING_RUNBOOK.md](PHASE_A_STAGING_RUNBOOK.md) A5 |
| 1.6 | ~500-session realtime soak | Pending | [REALTIME_SOAK_LOG.md](REALTIME_SOAK_LOG.md) |

## Phase 2 — Secrets (Section M 1–3)

Complete [PHASE_B_SECRETS_CHECKLIST.md](PHASE_B_SECRETS_CHECKLIST.md); copy sign-off links here.

| Step | Evidence |
|------|----------|
| B1 Client keys | |
| B2 Edge secrets | |
| B3 `EDGE_ALLOWED_ORIGINS` | |

## Phase 3 — Section L monitoring

Fill [PHASE_C_SECTION_L_EVIDENCE.md](PHASE_C_SECTION_L_EVIDENCE.md); then mark rows in [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) Section L.

**Pager:** Document route (email, PagerDuty, Opsgenie) in Phase C file.

## Phase 4 — Section M (M4–M10)

Track rows in [SECTION_M_GO_LIVE_CHECKLIST.md](SECTION_M_GO_LIVE_CHECKLIST.md).

| Row | Evidence |
|-----|----------|
| M4 Prod migrations | |
| M5 RLS on prod | |
| M6 Guardrails + Vercel prod env | CI + env audit |
| M7 k6 / SLO | |
| M8 Dashboards + paging | Phase C links |
| M9 Rollback rehearsal | Section N + owner notes |
| M10 Post-deploy smoke | |

## Phase 5 — Product / engineering

| Item | Status | Evidence |
|------|--------|----------|
| CSP enforcement or deferral | See [CSP_ROLLOUT.md](CSP_ROLLOUT.md) | Written deferral or `vercel.json` enforce |
| Degraded UX (Settings, Shop, Matches) | Shipped in app | Retry + clear errors on transient failures |
| `health` Edge deploy | Operator | `supabase functions deploy health`; [Health.tsx](../src/pages/Health.tsx) `edgeDatabase: ok` |
| Cookie preference centre + public team DB wave | Shipped in repo 2026-04-29 | [CHANGELOG.md](../CHANGELOG.md) § 2026-04-29; [MEMORY_BANK.md](../MEMORY_BANK.md); migrations `20260426121000`, `20260426122000`, `20260429130000` (+ optional `20260330160000`) — operator applies per env |
| Reports KPI + RBAC policy fix | Shipped in repo 2026-05-01 | [CHANGELOG.md](../CHANGELOG.md) § 2026-05-01; `src/pages/PlayerStats.tsx`; migration `20260430173000_fix_club_role_assignments_select_policy.sql` — operator applies per env |
| Public club microsite (DB + admin UX) | Shipped in repo 2026-05-03 | [CHANGELOG.md](../CHANGELOG.md) § 2026-05-03; [HOLD.md](../HOLD.md) May 2026 migration list; `ClubPageAdmin`, `public-page-flex-config.ts`, hero overlay config — operator applies `20260502120000`–`20260503143000` per env |
| Public club microsite UI (contrast + accent hovers) | Shipped in repo 2026-05-03 | [CHANGELOG.md](../CHANGELOG.md) second **2026-05-03** entry; `src/lib/public-club-cta-classes.ts`, `club-theme-provider.tsx`, public club pages — **no** migration delta |

## Phase 6 — Cadence

| Artifact | Action |
|----------|--------|
| [GAME_DAY_DRILL_LOG.md](GAME_DAY_DRILL_LOG.md) | At least one live drill with **MTTR** |
| [MONTHLY_COST_PERF_REVIEW.md](MONTHLY_COST_PERF_REVIEW.md) | Next review date after each run |
| [TASKS.md](../TASKS.md) PROD-DEPLOY-001 | Close when M1–M10 + operator evidence complete |
