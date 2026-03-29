# Section M go-live evidence

Track completion of [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) Section M. Add evidence links per row.

| # | Criterion | Done | Evidence |
|---|-----------|------|----------|
| 1 | Client env: only `VITE_SUPABASE_URL` and publishable key | ☐ | |
| 2 | Edge secrets and Stripe secrets set | ☐ | |
| 3 | `EDGE_ALLOWED_ORIGINS` non-wildcard in prod | ☐ | |
| 4 | Migrations applied; schema matches repo | ☐ | |
| 5 | RLS tests green on target env | ☐ | |
| 6 | Dev bypass flags off; guardrails passed | ☐ | |
| 7 | k6 smoke and staged runs meet SLOs | ☐ | |
| 8 | Dashboards and paging alerts (see SECTION_L_MONITORING_SETUP) | ☐ | |
| 9 | Rollback rehearsed | ☐ | |
| 10 | Post-deploy smoke passed | ☐ | |

Sign-off: name, date.
