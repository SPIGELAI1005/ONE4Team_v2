# Section L — monitoring and alerting setup

Maps to [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) Section L and **Observability thresholds**. Configure in each vendor UI; this file is the implementation checklist.

| # | Item | Where to configure | Threshold hint (from artifact) |
|---|------|--------------------|--------------------------------|
| 1 | Sentry error and release health | Sentry → Alerts, Releases | New issue rate vs baseline ×3 / 1h |
| 2 | Supabase DB CPU, connections, locks | Supabase → Reports / Database | CPU > 85% 15m |
| 3 | Supabase API latency and errors | Supabase → API / Logs | PostgREST p95 > 2s 10m; 5xx spikes |
| 4 | Edge Functions invocations, duration, failures | Supabase → Edge Functions | 5xx rate > 2% 15m |
| 5 | Stripe webhook failures and retries | Stripe → Developers → Webhooks | Sustained retry backlog |
| 6 | Realtime connections / throughput | Supabase Realtime metrics + client breadcrumbs | Disconnect burst > 5% sessions / 15m |
| 7 | Tenant isolation signals | CI RLS job + anomaly notes | RLS tests green on staging; policy drift optional |
| 8 | Business KPIs (checkout, messages, clubs, DAU) | Product analytics / custom | Team-defined |

**Pager:** Route severity to on-call (PagerDuty, Opsgenie, etc.) once rules exist.

**Done criteria:** Check boxes in Section L of the artifact when each row is live.
