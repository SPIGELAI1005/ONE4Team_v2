# Game day drill log (template)

Use for ST-010 validation. Record one row per drill.

| Date (UTC) | Scenario | Runbook | MTTR (min) | Pass/Fail | Gaps / tickets |
|------------|----------|---------|------------|-----------|----------------|
| 2026-03-29 | DB slowdown (desk review) | `ops/runbooks/db-slowdown.md` | n/a | Pass | Full live inject deferred |
| 2026-03-29 | Edge outage (desk review) | `ops/runbooks/edge-outage.md` | n/a | Pass | Confirm EDGE_ALLOWED_ORIGINS in prod |
| 2026-03-29 | Stripe backlog (desk review) | `ops/runbooks/stripe-webhook-backlog.md` | n/a | Pass | See reconciliation RPC in repo |
| 2026-03-29 | Realtime incident (desk review) | `ops/runbooks/realtime-incident.md` | n/a | Pass | 500-session lab soak still scheduled |

**Facilitator:** Engineering (artifact closure)  
**Participants:** (add names on next live drill)  
**Evidence links (dashboards, queries, logs):** CI green; staging dashboards per Section L owners

## Live / injected drills (next)

Run at least one scenario with a **timed** response (inject load, disable non-prod Edge, or replay Stripe failure in test mode). Record **MTTR** and link dashboards in a new table row above.

| Step | Action |
|------|--------|
| 1 | Pick scenario + facilitator; notify participants |
| 2 | Start timer; trigger fault per runbook |
| 3 | Execute mitigation steps only from runbooks (no ad-hoc heroics) |
| 4 | Stop timer; capture MTTR, gaps, ticket IDs |
| 5 | Update Section M row 9 if rollback was exercised |

**Realtime soak evidence:** [`REALTIME_SOAK_LOG.md`](REALTIME_SOAK_LOG.md).
