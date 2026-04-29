# ONE4Team Production Readiness Audit + Roadmap

Last updated: 2026-03-30 (doc sync: `CHANGELOG.md` § 2026-03-30, `MEMORY_BANK.md`, `PROJECT_STATUS.md`, `TASKS.md`, `README.md`, `DEPLOYMENT.md`)

This document captures the strict production-readiness review and a comprehensive remediation roadmap for scaling ONE4Team from early usage to multi-tenant SaaS operation.

## Execution progress (implemented)

- [x] Added production guardrail script: `scripts/assert-production-guardrails.cjs`.
- [x] Wired guardrail enforcement into CI workflow (`.github/workflows/ci.yml`).
- [x] Tightened Edge CORS fallback to fail closed unless allowlist/localhost (`supabase/functions/_shared/cors.ts`).
- [x] Added defense-in-depth tenant filter in player profile membership fetch (`src/pages/PlayerProfile.tsx`).
- [x] Added staged k6 artifact for dashboard read pressure (`k6/staged-dashboard-reads.js`).
- [x] Applied immediate analytics load mitigation in head-to-head (`src/components/analytics/HeadToHead.tsx`).
- [x] Added backend-enforced platform-admin RBAC migration + frontend RPC authorization check (`supabase/migrations/20260329103000_platform_admin_rbac.sql`, `src/pages/PlatformAdmin.tsx`).
- [x] Added first-step members list pagination and reduced membership over-fetch (`src/pages/Members.tsx`, `get_club_member_stats` RPC `20260329140000_club_member_stats_rpc.sql`).
- [x] **Members search:** `search_club_members_page` RPC + UI (2+ chars, full-roster server search; debounced) — `20260330120000_search_club_members_page.sql`.
- [x] **Ops templates:** index apply notes (`ops/HOTSPOT_INDEX_MIGRATION.md`), EXPLAIN template, realtime soak log, Section L/M checklists, CSP rollout doc, billing alert detail in Stripe runbook.
- [x] Added keyset-paginated matches loading (`limit` + `(match_date,id)` cursor + `count`, `src/pages/Matches.tsx`).
- [x] Added keyset-paginated messages (`limit` + `(created_at,id)` cursor + `count`) with channel page controls and page-1 realtime behavior (`src/pages/Communication.tsx`).
- [x] **ST-001:** Tenant matrix (`ops/TENANT_ACCESS_MATRIX.md`); env-gated JWT RLS tests (`src/test/rls.integration.test.ts`); optional policy drift script (`scripts/assert-pg-policies-drift.cjs`, `ops/PG_POLICIES_SNAPSHOT.md`).
- [x] **ST-002/003:** Privileged flow inventory (`ops/PRIVILEGED_FLOWS.md`); correlation logging extended to `co-trainer`, `stripe-checkout`, `chat-bridge`.
- [x] **ST-004:** Platform admin audit table + `log_platform_admin_action` (`20260329141000_platform_admin_audit.sql`); client log on data load (`src/pages/PlatformAdmin.tsx`).
- [x] **ST-005/006/007 evidence:** Fan-out audit doc (`ops/FAN_OUT_AUDIT.md`); index verification template (`ops/STAGING_INDEX_VERIFICATION.md`); k6 matches keyset-style request (`k6/staged-dashboard-reads.js`).
- [x] **ST-008/010/011 ops:** Game day desk review rows (`ops/GAME_DAY_DRILL_LOG.md`); realtime soak + alert notes (`ops/runbooks/realtime-incident.md`); Stripe replay checklist script (`scripts/stripe-replay-checklist.cjs`).
- [x] **ST-012+:** First monthly cost/perf review logged (`ops/MONTHLY_COST_PERF_REVIEW.md`); optional route budgets doc (`ops/ROUTE_PERF_BUDGETS.md`).
- [x] **Wave 3:** Health PostgREST probe (`src/pages/Health.tsx`); roadmap (`ops/WAVE3_ROADMAP.md`).
- [x] Replaced `HeadToHead` client-side aggregation with SQL/RPC-backed aggregate (`supabase/migrations/20260329112000_head_to_head_stats_rpc.sql`, `src/components/analytics/HeadToHead.tsx`).
- [x] Replaced `TeamChemistry` and `AttendanceHeatmap` client fan-out queries with SQL/RPC-backed aggregates (`supabase/migrations/20260329115000_analytics_rpc_batch.sql`, `src/components/analytics/TeamChemistry.tsx`, `src/components/analytics/AttendanceHeatmap.tsx`).
- [x] Replaced `PlayerStats` client-side match/event/member fan-out with one filtered RPC-backed payload (`supabase/migrations/20260329122000_player_stats_aggregate_rpc.sql`, `src/pages/PlayerStats.tsx`).
- [x] **ST-006 residual:** `get_season_award_winners` + `get_player_radar_stats` RPCs (`20260329130000_season_awards_player_radar_rpc.sql`); `SeasonAwards.tsx` + `PlayerRadarChart.tsx` single-call refactor.
- [x] **ST-006 fix:** Corrected `is_member_of_club` argument order in analytics RPCs (`20260329131000_fix_analytics_rpc_is_member_arg_order.sql`).
- [x] **ST-007:** Hotspot composite indexes (`20260329132000_hotspot_composite_indexes.sql`); capture before/after via Supabase Query Performance + `EXPLAIN (ANALYZE, BUFFERS)` on: `matches` by `(club_id,status,match_date)`, `messages` by `(club_id,created_at desc)`, `match_events`/`match_lineups` by `(match_id,membership_id)`.
- [x] **ST-008:** Communication realtime policy — per-club channel name, no resubscribe on pagination (`messagePageRef`), 80ms insert batching, `selectedChannelRef` to avoid channel churn (`src/pages/Communication.tsx`). Burst validation: `npm run audit:realtime` + staged k6 reads; lab soak 500 concurrent sessions per runbook.
- [x] **ST-009:** Client correlation helpers + session id (`src/lib/observability.ts`); Edge structured logs + `x-correlation-id` (`supabase/functions/_shared/request_context.ts`, `stripe-webhook`). Alert/dashboard owners: see **Observability thresholds** below.
- [x] **ST-010:** Incident runbooks (`ops/runbooks/*.md`) + drill log scaffold (`ops/GAME_DAY_DRILL_LOG.md`).
- [x] **ST-011:** Webhook JSON logging with correlation; reconciliation RPC `get_billing_reconciliation_snapshot()` for platform admins (`20260329133000_billing_reconciliation_rpc.sql`); replay remains Stripe idempotent + `stripe_processed_events` lease pattern.
- [x] **ST-012:** CI bundle budget gate (`scripts/assert-bundle-budget.cjs`, `npm run budget:bundle`, `.github/workflows/ci.yml`).

### Observability thresholds (ST-009) — owners

| Signal | Threshold (initial) | Owner |
|--------|---------------------|--------|
| PostgREST p95 latency | > 2s for 10m | Backend |
| DB CPU | > 85% 15m | Backend |
| Edge function 5xx rate | > 2% 15m | Platform |
| Stripe webhook delivery failure | any sustained retry backlog | Billing |
| Realtime disconnect burst | > 5% sessions / 15m | Client |
| Sentry new issue rate | > baseline ×3 / 1h | Engineering |

### Index verification (ST-007) — EXPLAIN template

Run against staging after migration apply:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM matches
WHERE club_id = '<club>' AND status = 'completed'
ORDER BY match_date DESC NULLS LAST LIMIT 50;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at FROM messages
WHERE club_id = '<club>' ORDER BY created_at DESC LIMIT 50;
```

Store snapshots in ticket; compare planning time and buffer hits before vs after.

### Open vs closed (read this first)

| Status | Topic | Where tracked |
|--------|--------|----------------|
| **Closed in repo** | ST-006–ST-012 code deliverables (RPCs, indexes, realtime client policy, correlation helpers, runbooks scaffold, webhook logging, bundle CI) | **Execution progress** above |
| **Open — ops wiring** | Live dashboards, pager alerts, game-day drills with real MTTR, production go-live checklist (Section M) | Section L/M; owner runbooks |
| **Open — verification** | RLS JWT tests green on **your** staging when env secrets set; EXPLAIN snapshots filed in tickets; 500-session realtime lab soak | `npm test` + env; `ops/STAGING_INDEX_VERIFICATION.md`; `ops/runbooks/realtime-incident.md` |
| **Open — product/engineering** | CSP **enforcement** on the SPA host; broader degraded-mode UX (retry actions, timeouts) beyond members search | `ops/CSP_ROLLOUT.md`; `src/lib/supabase-error-message.ts`; `ops/WAVE3_ROADMAP.md` |

### Execution runbooks (operator — phased plan)

- **Completion plan (all open topics, ordered):** [`ops/PRODUCTION_READINESS_COMPLETION_PLAN.md`](PRODUCTION_READINESS_COMPLETION_PLAN.md)
- **Evidence index (staging/prod links + repo checks):** [`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`](PRODUCTION_READINESS_EVIDENCE_LOG.md)
- **Phase A (staging verification):** [`ops/PHASE_A_STAGING_RUNBOOK.md`](PHASE_A_STAGING_RUNBOOK.md)
- **Phase B (secrets / client env):** [`ops/PHASE_B_SECRETS_CHECKLIST.md`](PHASE_B_SECRETS_CHECKLIST.md)
- **Phase C (Section L evidence table):** [`ops/PHASE_C_SECTION_L_EVIDENCE.md`](PHASE_C_SECTION_L_EVIDENCE.md)
- **Section M (go-live):** [`ops/SECTION_M_GO_LIVE_CHECKLIST.md`](SECTION_M_GO_LIVE_CHECKLIST.md)

---

## SECTION A. Executive summary

### Blunt production maturity summary

ONE4Team is currently a **Vite + React SPA backed by Supabase** (PostgREST, Auth, Storage, Edge Functions).  
It is **not** a Next.js + Express + Prisma architecture in the current repository.

The platform has meaningful foundations (RLS-centric model, Stripe webhook idempotency pattern, CI, existing k6 scripts), but still has several high-risk production gaps around:

- strict tenant isolation verification in deployed environments
- client-heavy query patterns without robust pagination
- UI-only role gating as a secondary control
- incomplete SRE-grade observability and incident signals

### Top 10 deployment/scalability risks

1. Security boundary depends on RLS correctness; one bad policy migration can expose cross-club data.
2. Admin/trainer route guards are client-side (`RequireAdmin`, `RequireTrainer`) and must always be backed by server-side policy enforcement.
3. Some surfaces still use large caps (`limit(800)` in match detail, etc.); members roster is server-paged with **full-club search** via `search_club_members_page` when 2+ characters (migration `20260330120000_search_club_members_page.sql`).
4. Residual `.in("match_id", …)` exists for bounded widgets; see `ops/FAN_OUT_AUDIT.md`.
5. Realtime chat subscription pattern can become costly under high concurrent usage.
6. Platform admin is enforced with `is_platform_admin()`; client allowlist (if any) is UX-only.
7. Edge CORS fails closed outside allowlist when `EDGE_ALLOWED_ORIGINS` is configured; deploy must set it in prod.
8. Health probes Auth + PostgREST root (publishable key); full DB depth still optional via synthetic checks.
9. Edge and DB observability are not yet complete for rapid incident diagnosis.
10. Cost risk from repeated live-table reads and client fan-out at dashboard level.

### Go-live status

**Conditionally Ready** for controlled rollout with strict guardrails.  
Not ready for uncontrolled high-scale production without the roadmap items below.

---

## SECTION B. Readiness scoring

| Area | Score | Short justification |
|---|---:|---|
| Deployment readiness | 64 | CI solid; Section M checklist and prod templates remain operator-owned (`ops/SECTION_M_GO_LIVE_CHECKLIST.md`). |
| Scalability readiness | 58 | RPC analytics, keyset lists, guarded index migration, server member search reduce tail risk; caps remain on some detail views. |
| Security readiness | 66 | RBAC + CORS + RLS test scaffold; staging/prod JWT proof still the gate. |
| Observability readiness | 48 | Logs/correlation in repo; Section L wiring is external (`ops/SECTION_L_MONITORING_SETUP.md`). |
| Tenant isolation readiness | 74 | Matrix + integration tests + mutation probe; run with secrets on target env. |
| Overall production readiness | 61 | Code path credible for controlled rollout; ops verification and monitoring close the loop. |

---

## SECTION C. Prioritized risk register

| ID | Severity | Category | Issue | Affected modules/files | Why it fails at scale | Business impact | Technical fix | Validation method |
|---|---|---|---|---|---|---|---|---|
| R1 | Critical | Tenant isolation | Security boundary is policy-driven (RLS) and can drift | `supabase/migrations/*`, all Supabase reads/writes | Policy drift scales blast radius across all tenants | Data leak / compliance breach | Policy test suite + migration drift checks | Compare deployed `pg_policies` to repo; negative JWT tests |
| R2 | High | AuthZ | UI role gates are not primary backend authorization | `src/components/auth/require-role.tsx`, `src/App.tsx` | Any backend gap is exploitable directly | Privilege misuse | Keep strict RLS and add server RPCs for sensitive paths | Forbidden mutation tests with non-admin JWT |
| R3 | High | Query scalability | ~~Unbounded list reads~~ **Reduced:** keyset matches/messages; server-paged members + search RPC | `Members.tsx`, `Matches.tsx`, `Communication.tsx` | Residual caps on match detail, etc. | Latency + cost | Narrow selects; watch hot paths | k6 + Query Performance |
| R4 | High | Analytics | ~~Expensive client `in(match_id, …)`~~ **Reduced:** chart aggregates moved to RPC | `src/components/analytics/*`, `PlayerStats.tsx` | Residual non-RPC reads on other routes | Slow dashboards | Audit non-analytics routes; materialized views if needed | k6 + Query Performance |
| R5 | High | Governance security | ~~Client-only platform admin~~ **Mitigated:** `platform_admins` + RPC gate + audit RPC | `PlatformAdmin.tsx`, `20260329103000_platform_admin_rbac.sql`, `20260329141000_platform_admin_audit.sql` | Break-glass process | Ops mistakes | Expand audit to more actions if needed | Platform admin JWT tests |
| R6 | High | Realtime | Per-user realtime scaling risk in communication | `src/pages/Communication.tsx` | High connection and event fan-out pressure | Messaging instability | Channel strategy limits and batching | Realtime connection metrics + load test |
| R7 | Medium | Edge hardening | ~~Wildcard CORS when unset~~ **Mitigated:** fail-closed unless allowlist/localhost | `supabase/functions/_shared/cors.ts` | Mis-set `EDGE_ALLOWED_ORIGINS` in prod still risky | Abuse risk | Set explicit production allowlist | Deployment config audit |
| R8 | Medium | Payments resilience | Webhook reliability tied to secret/config correctness | `supabase/functions/stripe-webhook/index.ts` | Billing drift under failures/retries | Revenue and trust risk | Webhook replay drills + alerting | Stripe test event replay |
| R9 | Medium | Dev/prod separation | Dev bypass flags must remain strictly non-prod | `src/contexts/AuthContext.tsx`, `src/components/auth/require-role.tsx` | Mis-set env could bypass controls | Severe unauthorized access | CI policy checks on production env | Build-time env assertion |
| R10 | Medium | Observability | Limited tracing + correlation IDs | `src/lib/observability.ts`, Edge logs | Incidents become hard to triage | Long MTTR | Structured logs + request IDs + dashboards | Incident simulation drill |
| R11 | Medium | Health semantics | `/health` is not complete readiness | `src/pages/Health.tsx` | Can return green despite degraded internals | False confidence | Add backend health probes and synthetic checks | Synthetic monitor gates |
| R12 | Low | Frontend perf | Heavy bundle/components for some routes | `vite.config.ts`, chart-heavy pages | Mobile perf degrades with usage growth | Slower adoption | Additional route-level splitting and budget gates | Lighthouse + bundle CI |

---

## SECTION D. Route and endpoint hotspot audit

| Hotspot | 10 users | 100 users | 500 users | 1,000 users | 10,000 users |
|---|---|---|---|---|---|
| Dashboard content fan-out reads | Healthy | Minor latency | Significant p95 increase | Timeouts likely in bursts | Requires cache/precompute |
| Members list and filters | Healthy | Acceptable | Payloads become heavy | UX lag, incomplete visibility due to caps | Must use cursor pagination |
| Matches + detail loading | Healthy | Acceptable | Query + payload pressure | Slow detail views | Needs server-side aggregation |
| Communication + realtime | Healthy | Mostly stable | Connection/event pressure | Saturation risk | Needs stronger realtime architecture |
| Public club page | Healthy | Stable | Read spike risk | Origin pressure | CDN and cache strategy mandatory |
| Co-trainer/AI edge calls | Healthy | Managed by rate limits | Increased 429s | User experience degradation | Queue + per-tenant quotas required |

---

## SECTION E. Database and query audit (Supabase/Postgres)

Note: Prisma is not present in this repository. The stack is Supabase + SQL migrations.

### Confirmed findings

- query shapes on several pages over-fetch fields or rows for interactive views
- fixed limits are used as safety caps but do not provide true pagination semantics
- analytics composition in the client can be replaced by pre-aggregated SQL/RPC
- RLS policies exist and are central to security posture

### Code-level change already applied

- `src/pages/PlayerProfile.tsx`: membership fetch now includes explicit `.eq("club_id", clubId)` before `.eq("id", membershipId)` for defense-in-depth.

### Required DB-level hardening

1. add strict policy tests as part of CI gates
2. add/verify composite indexes on hottest access patterns (`club_id` + time/order columns)
3. migrate expensive analytics to SQL functions/materialized views
4. standardize cursor pagination for all high-volume tables

---

## SECTION F. RBAC and tenant isolation audit

### Correctly enforced (verified in code)

- edge checkout flow validates club admin via RPC (`is_club_admin`)
- co-trainer edge verifies club membership/admin conditions before privileged actions
- many core table queries are club-scoped in the app layer and intended to be enforced by RLS

### Uncertain (needs deployment validation)

- production Supabase policy set parity with repository migrations
- platform-level reporting flows audited end-to-end (reads now gated by `is_platform_admin()`)

### Broken or weak

- frontend role hiding is not a standalone security control
- **Updated:** platform admin **authorization** is server-enforced via `platform_admins` + `is_platform_admin()`; optional email env hints must not be treated as security controls

---

## SECTION G. Module-by-module audit summary

| Module | Key risks | Priority |
|---|---|---|
| Member management | list/query scaling, bulk import/export safeguards, true pagination | High |
| Payment handling | webhook replay safety, reconciliation visibility, alerting | High |
| Communication | realtime fan-out, attachment throughput, duplicate delivery controls | High |
| Analytics | expensive live-table aggregations, cache/precompute strategy | High |
| Partner dashboard | policy isolation and reporting scope validation | Medium/High |
| Team shop | stock/order consistency under concurrency, media handling cost | High |
| Custom club websites | public/private boundary checks, caching and domain strategy | Medium |
| Mobile support | contract stability, pagination consistency, versioning path | Medium |
| Integrations | timeout/retry behavior, failure isolation, webhook validation | High |

---

## SECTION H. Concrete remediation plan (roadmap by sprint)

## Sprint 1 (critical go-live blockers)

| Objective | Exact technical task | Impacted area | Expected benefit | Validation criteria |
|---|---|---|---|---|
| Lock tenant isolation | Build automated RLS negative/positive tests for multi-club JWTs | DB/RLS | Prevent cross-tenant leakage | all policy tests pass in staging/prod |
| Harden edge origins | Set `EDGE_ALLOWED_ORIGINS` with explicit domain list in production | Edge security | Reduced abuse surface | config check in deploy pipeline |
| Fix admin model baseline | Replace client-only platform admin read path with server-authorized layer | Platform admin | Reliable and secure ops visibility | non-admin cannot read platform aggregates |
| Stabilize high-risk reads | Introduce cursor pagination for members/messages/matches | High-traffic pages | Lower payload and DB pressure | p95 improves under staged k6 |
| Enforce env separation | Add CI assertion forbidding dev bypass flags in production build | Build/release | Prevent accidental privilege bypass | pipeline fails on invalid env |

## Sprint 2 (high-priority scale and security)

| Objective | Exact technical task | Impacted area | Expected benefit | Validation criteria |
|---|---|---|---|---|
| Reduce analytics DB load | Move expensive chart logic into SQL RPC/materialized views | Analytics pages | Lower query latency and cost | dashboard p95/p99 target met |
| Strengthen observability | Structured logs, request IDs, error budget alerts, Edge dashboards | SRE/ops | Faster detection and triage | alert drill passes |
| Realtime containment | Channel subscription limits and workload controls | Communication | Reduced saturation risk | stable realtime metrics at 500+ users |
| Payment incident readiness | Webhook replay runbook + automated alerting thresholds | Billing | Faster billing recovery | replay test + alert fire tests pass |

## Sprint 3 (optimization and resilience hardening)

| Objective | Exact technical task | Impacted area | Expected benefit | Validation criteria |
|---|---|---|---|---|
| Build resilient fallback behavior | Add degraded-mode UX for slow DB/edge dependency failures | App UX | Better user continuity under incidents | chaos tests show graceful degradation |
| Cost control architecture | Cache strategy, precompute cadence, query budget governance | Cross-cutting | Predictable infra spend | cost and latency trends flatten |
| Security hardening depth | CSP strategy, additional abuse/rate controls, audit event expansion | Security | Lower exploitability and better forensics | periodic security review checks pass |

---

## SECTION I. Code changes implemented during audit

1. `src/pages/PlayerProfile.tsx` tenant filter defense-in-depth (`.eq("club_id", clubId)` on membership detail).
2. `k6/staged-dashboard-reads.js` — staged dashboard read profile + RPC sample.
3. Analytics RPC bundle (`get_head_to_head_stats`, chemistry/heatmap, `get_player_stats_aggregate`, season awards, player radar) and `is_member_of_club` argument-order fix migration.
4. Hotspot composite indexes migration (table existence guards for partial DBs).
5. Communication realtime policy (per-club channel, pagination-stable subscription, insert batching).
6. Observability: `correlationHeaders`, Edge `request_context`, Stripe webhook structured logs + `x-correlation-id`.
7. Ops: runbooks, `GAME_DAY_DRILL_LOG.md`, `MONTHLY_COST_PERF_REVIEW.md`, `PRIVILEGED_FLOWS.md`, tenant matrix, RLS integration test scaffold, policy drift script.
8. Platform admin audit logging RPC + migration (`log_platform_admin_action`).
9. CI: production guardrails, bundle budget, E2E.
10. `Health.tsx` — lightweight PostgREST reachability check (complements browser-only checks).
11. `search_club_members_page` + Members debounced full-roster search (profiles + master fields; not email substring in SQL).
12. `src/lib/supabase-error-message.ts` — baseline for consistent error copy.
13. Ops: `HOTSPOT_INDEX_MIGRATION.md`, `EXPLAIN_EVIDENCE_TEMPLATE.md`, `REALTIME_SOAK_LOG.md`, `SECTION_L_MONITORING_SETUP.md`, `SECTION_M_GO_LIVE_CHECKLIST.md`, `CSP_ROLLOUT.md`.

---

## SECTION J. Load testing plan

### Scenarios

- login burst
- dashboard mixed reads
- member browsing/search/list
- payment checkout + webhook replay behavior
- communication burst + realtime subscription load
- analytics/reporting read pressure
- partner dashboard reporting checks
- mixed multi-tenant traffic (small and large clubs together)

### Target load bands

| Band | Concurrency target | Intent |
|---|---:|---|
| L1 | 10 | baseline correctness and latency |
| L2 | 100 | first saturation signals |
| L3 | 500 | sustained load validation |
| L4 | 1,000 | stress and bottleneck discovery |
| L5 | 10,000 | executive stress scenario (gated approval only) |

### Pass/fail defaults

- p95 latency under critical journey target
- p99 bounded for key reads/writes
- error rate below threshold during sustained load
- no cross-tenant leakage in sampled response validation
- no uncontrolled growth in DB connections/realtime channels

---

## SECTION K. k6 artifacts

Current scripts:

- `k6/smoke.js`
- `k6/journeys-critical.js`
- `k6/edge-co-trainer-smoke.js`
- `k6/staged-dashboard-reads.js` (added)

Execution baseline:

- `npm run k6:smoke`
- `npm run k6:journeys`
- `k6 run k6/staged-dashboard-reads.js`

---

## SECTION L. Monitoring and alerting checklist

**Repo status:** Thresholds and owners are defined under **Observability thresholds** above; runbooks exist under `ops/runbooks/`. Implementation steps: [`ops/SECTION_L_MONITORING_SETUP.md`](SECTION_L_MONITORING_SETUP.md). Checkboxes below require **configuration in Sentry / Supabase / Stripe / your pager** (not automatable in git alone).

- [ ] Sentry error and release health alerts configured
- [ ] Supabase DB: CPU, connections, read/write latency, locks
- [ ] Supabase API: 4xx/5xx, p95 latency by endpoint/table
- [ ] Edge Functions: invocations, duration, failures by function
- [ ] Stripe webhook failures and retry backlog alerts
- [ ] Realtime connection and event throughput alerts
- [ ] Tenant-isolation incident signal monitoring (policy tests + anomaly checks)
- [ ] Business KPIs: checkout success, message delivery, active clubs, DAU by tenant size

---

## SECTION M. Go-live deployment checklist (pass/fail)

Track evidence in [`ops/SECTION_M_GO_LIVE_CHECKLIST.md`](SECTION_M_GO_LIVE_CHECKLIST.md).

| # | Criterion | Pass |
|---|---|---|
| 1 | Production env has only required public keys in client (`VITE_SUPABASE_URL`, publishable key) | ☐ |
| 2 | Edge secrets set (`SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, allowed origins) | ☐ |
| 3 | `EDGE_ALLOWED_ORIGINS` explicitly set (no wildcard fallback) | ☐ |
| 4 | All required migrations applied and verified against production schema | ☐ |
| 5 | RLS policy regression test suite passed on target environment | ☐ |
| 6 | Dev bypass flags disabled in production build | ☐ |
| 7 | k6 baseline and staged load tests meet SLO thresholds | ☐ |
| 8 | Monitoring dashboards and paging alerts active | ☐ |
| 9 | Rollback path rehearsed with owner and runbook | ☐ |
| 10 | Production smoke tests passed post-deploy | ☐ |

---

## SECTION N. Rollback checklist

1. freeze deployments and activate incident response channel
2. rollback frontend to last known good release
3. if migration impact exists, prefer forward-fix unless safe rollback is pre-validated
4. disable risky feature toggles (shop/partner/ai paths) if needed
5. replay failed Stripe events after fix
6. execute post-incident review with action items tied to this roadmap

---

## Comprehensive roadmap (execution view)

This roadmap converts audit findings into delivery waves. Each wave should produce measurable reductions in risk and latency.

### Wave 1: Security and tenant hard gates (Weeks 1-2)

- RLS test harness for cross-tenant negative cases
- platform admin backend authorization model
- origin lock and prod env policy checks
- release gate: no deployment without policy test pass

Exit criteria:

- zero known tenant isolation gaps
- all privileged actions require backend-enforced authorization
- production config hardening checks automated

### Wave 2: Query and throughput stabilization (Weeks 3-5)

- cursor pagination rollout for members/matches/messages
- analytics SQL RPC replacements for expensive client aggregates
- realtime subscription strategy and per-tenant controls
- release gate: p95 and error targets at 500 concurrent test users

Exit criteria:

- no critical route relies on unbounded or arbitrary fixed-cap reads
- dashboard/analytics latency within target SLOs
- realtime behavior stable under burst profiles

### Wave 3: Operability and resilience (Weeks 6-8)

- full SRE dashboards and alert runbooks
- degraded-mode UX and retry/backoff policy standardization
- incident simulation for DB slowdowns, webhook failures, and provider outages
- release gate: simulated incident MTTR within defined objective

Exit criteria:

- major failure modes observable and actionable
- rollback and recovery runbooks validated
- clear SLO ownership per subsystem

### Wave 4: Cost and long-scale readiness (Weeks 9-12)

- cache and precompute strategy for public pages and analytics
- query budget governance (per route/module)
- periodic performance budget checks in CI
- release gate: cost-per-tenant growth slope within target

Exit criteria:

- predictable scaling economics
- no critical module depends on luck at high concurrency
- readiness package supports controlled expansion to higher tenant counts

---

## Ticket-ready backlog (Epic -> Story -> Task)

Planning assumptions:

- Estimate unit for epics/stories: **ideal engineering days**
- Estimate unit for tasks: **ideal hours**
- Owners are role-based placeholders; map to named people in your PM tool
- Priority: `P0` (blocker), `P1` (high), `P2` (important), `P3` (optimization)

### Owner map

| Owner code | Role |
|---|---|
| PE | Principal Engineer (overall technical lead) |
| BE | Backend/Supabase Engineer |
| FE | Frontend Engineer |
| SRE | SRE/Platform Engineer |
| SEC | Security Engineer |
| QA | QA/Automation Engineer |
| PM | Product/Delivery Manager |

### Epic backlog

| Epic ID | Epic | Priority | Owner | Estimate | Depends on | Exit criteria |
|---|---|---|---|---:|---|---|
| EPIC-01 | Tenant Isolation and Authorization Hardening | P0 | PE + SEC | 14d | - | RLS tests green; backend-enforced privileged checks; no known cross-tenant leak path |
| EPIC-02 | Query Scalability and Pagination | P0 | BE + FE | 16d | EPIC-01 | Cursor pagination live on critical pages; dashboard p95 target met at 500 concurrent users |
| EPIC-03 | Realtime and Communication Throughput | P1 | BE + SRE | 10d | EPIC-02 | Realtime stable under burst; channel/event limits defined and tested |
| EPIC-04 | Observability, SLOs, and Incident Response | P0 | SRE | 12d | EPIC-01 | Alerts, dashboards, runbooks, and drills complete |
| EPIC-05 | Payments Reliability and Reconciliation | P1 | BE | 8d | EPIC-01 | Webhook replay safe; billing events observable; reconciliation runbook validated |
| EPIC-06 | Platform Admin and Governance Controls | P1 | BE + SEC | 9d | EPIC-01 | Platform admin fully server-enforced and auditable |
| EPIC-07 | Cost and Performance Governance | P2 | PE + SRE | 10d | EPIC-02, EPIC-04 | Query budgets and performance budgets enforced in CI |

### Story backlog with dependency ordering

| Story ID | Epic | Story | Priority | Owner | Estimate | Depends on |
|---|---|---|---|---|---:|---|
| ST-001 | EPIC-01 | Build RLS regression test suite for multi-tenant access | P0 | SEC + BE | 4d | - |
| ST-002 | EPIC-01 | Enforce backend authorization for privileged operations | P0 | BE | 3d | ST-001 |
| ST-003 | EPIC-01 | Add production config guardrails (origins/dev flags) | P0 | SRE | 2d | ST-001 |
| ST-004 | EPIC-06 | Replace client-only platform admin model with backend authority | P1 | BE + SEC | 4d | ST-002 |
| ST-005 | EPIC-02 | Introduce cursor pagination for members/messages/matches | P0 | FE + BE | 5d | ST-001 |
| ST-006 | EPIC-02 | Replace expensive analytics client aggregations with SQL RPC | P1 | BE | 4d | ST-005 |
| ST-007 | EPIC-02 | Query/index optimization for top 10 slow access paths | P1 | BE | 3d | ST-005 |
| ST-008 | EPIC-03 | Realtime subscription control and connection budgets | P1 | BE + SRE | 4d | ST-005 |
| ST-009 | EPIC-04 | End-to-end dashboards/alerts (DB, API, Edge, Stripe, Realtime) | P0 | SRE | 4d | ST-003 |
| ST-010 | EPIC-04 | Incident response runbooks + game day simulation | P1 | SRE + QA | 3d | ST-009 |
| ST-011 | EPIC-05 | Stripe webhook replay + reconciliation workflow hardening | P1 | BE | 3d | ST-002 |
| ST-012 | EPIC-07 | Performance and cost budget checks in CI | P2 | SRE + PE | 3d | ST-007, ST-009 |

### Task breakdown (ticket-ready)

| Task ID | Story | Task | Owner | Estimate | Depends on | Deliverable |
|---|---|---|---|---:|---|---|
| T-001 | ST-001 | Define tenant access matrix (member/trainer/admin/platform) | SEC | 4h | - | Security test matrix artifact |
| T-002 | ST-001 | Implement automated JWT policy tests for allowed/forbidden reads | BE | 8h | T-001 | Test suite in CI |
| T-003 | ST-001 | Add forbidden mutation tests on sensitive tables | BE | 6h | T-001 | CI test coverage for writes |
| T-004 | ST-001 | Add migration drift check against deployed policies | SRE | 6h | T-002 | Drift report gate |
| T-005 | ST-002 | Inventory privileged flows and map to backend checks | PE | 4h | ST-001 | Privileged flow registry |
| T-006 | ST-002 | Add/validate RPC checks for admin-only actions | BE | 8h | T-005 | Protected backend actions |
| T-007 | ST-002 | Add regression tests for non-admin rejection paths | QA | 4h | T-006 | AuthZ test cases |
| T-008 | ST-003 | Enforce `EDGE_ALLOWED_ORIGINS` in prod env templates | SRE | 3h | ST-001 | Hardened env config |
| T-009 | ST-003 | Add CI check to fail on dev bypass flags in prod build | SRE | 4h | T-008 | Build policy gate |
| T-010 | ST-003 | Add release checklist automation for critical secrets | SRE | 5h | T-008 | Pre-deploy validation script |
| T-011 | ST-004 | Implement server-backed `is_platform_admin` decision path | BE | 8h | ST-002 | Backend admin gate |
| T-012 | ST-004 | Refactor platform admin UI to consume server aggregate endpoint | FE | 6h | T-011 | Updated admin page |
| T-013 | ST-004 | Add audit log for platform admin actions | BE | 5h | T-011 | Admin audit trail |
| T-014 | ST-005 | Add cursor pagination contract for members list | BE | 6h | ST-001 | API/query pagination pattern |
| T-015 | ST-005 | Implement paginated UI state in members page | FE | 8h | T-014 | Members pagination UX |
| T-016 | ST-005 | Add pagination for messages and matches views | FE | 8h | T-014 | Messages/matches pagination UX |
| T-017 | ST-005 | Add load/perf tests for paginated endpoints | QA | 4h | T-015, T-016 | k6 scenarios updated |
| T-018 | ST-006 | Design SQL RPC for head-to-head/stat aggregates | BE | 5h | ST-005 | RPC specification |
| T-019 | ST-006 | Implement and benchmark analytics RPCs | BE | 8h | T-018 | SQL functions + benchmark |
| T-020 | ST-006 | Refactor analytics components to use RPC payloads | FE | 6h | T-019 | Lean analytics queries |
| T-021 | ST-007 | Capture top 10 slow queries from staging load tests | SRE | 4h | ST-005 | Query hotspot report |
| T-022 | ST-007 | Add missing composite indexes for hotspot patterns | BE | 6h | T-021 | Index migration bundle |
| T-023 | ST-007 | Verify improvements with before/after EXPLAIN plans | BE | 4h | T-022 | Query optimization evidence |
| T-024 | ST-008 | Define realtime channel policy (limits, naming, fan-out) | BE | 4h | ST-005 | Realtime architecture note |
| T-025 | ST-008 | Implement client subscription throttling/batching | FE | 6h | T-024 | Reduced channel churn |
| T-026 | ST-008 | Add monitoring alerts on connection/event thresholds | SRE | 4h | T-024 | Realtime alerts |
| T-027 | ST-009 | Build SRE dashboards for DB/API/Edge/Stripe | SRE | 8h | ST-003 | Dashboard set |
| T-028 | ST-009 | Configure pager alerts and severity routing | SRE | 4h | T-027 | Alert policy config |
| T-029 | ST-009 | Add request correlation ID strategy for edge logs | BE | 6h | T-027 | Correlated observability |
| T-030 | ST-010 | Write incident runbooks (DB slow, webhook fail, edge outage) | SRE | 6h | ST-009 | Runbook package |
| T-031 | ST-010 | Execute game day simulation and capture action items | QA + SRE | 6h | T-030 | Drill report |
| T-032 | ST-011 | Add webhook replay command/runbook and verification checks | BE | 5h | ST-002 | Replay capability |
| T-033 | ST-011 | Implement reconciliation report for billing_events/subscriptions | BE | 6h | T-032 | Reconciliation artifact |
| T-034 | ST-011 | Add billing incident alerts and ownership | SRE | 3h | T-033 | Billing alert policy |
| T-035 | ST-012 | Define performance budgets per critical route | PE | 4h | ST-007 | Perf budget spec |
| T-036 | ST-012 | Add CI budget gates (bundle/query regression checks) | SRE | 6h | T-035 | CI policy gates |
| T-037 | ST-012 | Add monthly cost trend report by module | PM + SRE | 4h | ST-036 | Cost governance cadence |

### Dependency order (implementation sequence)

1. ST-001 -> ST-002 -> ST-003 (security baseline gates)
2. ST-004 in parallel with ST-005 once ST-002 is complete
3. ST-006 and ST-007 after ST-005 pagination foundation
4. ST-008 after ST-005 (realtime controls align with paginated loading strategy)
5. ST-009 starts after ST-003; ST-010 after ST-009
6. ST-011 after ST-002; ST-012 after ST-007 and ST-009

### Suggested sprint packing (2-week cadence)

| Sprint | Planned stories |
|---|---|
| Sprint 1 | ST-001, ST-002, ST-003 |
| Sprint 2 | ST-004, ST-005 |
| Sprint 3 | ST-006, ST-007, ST-008 |
| Sprint 4 | ST-009, ST-010, ST-011 |
| Sprint 5 | ST-012 + spillover/hardening |

### Definition of done for every story

- code merged with tests
- security checks updated where relevant
- load/perf validation attached
- runbook/alert updates linked
- owner accepts against explicit acceptance criteria
