# Section M go-live evidence

Track completion of [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) Section M. Add evidence links per row (ticket URL, screenshot, or log path).

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
