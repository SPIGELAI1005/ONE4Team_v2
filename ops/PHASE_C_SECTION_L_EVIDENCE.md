# Phase C — Section L monitoring evidence

**Evidence index:** [PRODUCTION_READINESS_EVIDENCE_LOG.md](PRODUCTION_READINESS_EVIDENCE_LOG.md) (Phase 3).

Configure alerts in vendor UIs per [SECTION_L_MONITORING_SETUP.md](SECTION_L_MONITORING_SETUP.md). This file is for **links and sign-off** only.

| # | Item | Configured (Y/N) | Evidence link / notes |
|---|------|--------------------|------------------------|
| 1 | Sentry error + release health | | |
| 2 | Supabase DB CPU, connections, locks | | |
| 3 | Supabase API 4xx/5xx, p95 latency | | |
| 4 | Edge Functions invocations, duration, failures | | |
| 5 | Stripe webhook failures / retry backlog | | |
| 6 | Realtime connections / throughput | | |
| 7 | Tenant isolation (RLS tests / drift cadence) | | |
| 8 | Business KPIs (as applicable) | | |

**Pager:** Document on-call route (PagerDuty/Opsgenie/etc.).

**Done:** Check Section L boxes in [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) when each row is live.

**Section M row 8** depends on this phase (dashboards + paging alerts active).
