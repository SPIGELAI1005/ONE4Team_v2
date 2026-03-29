# Wave 3 / 4 backlog (post ST-*)

Items not fully covered by story codes; track here and in product backlog.

## Health and reliability

- **Health page:** `src/pages/Health.tsx` now probes Auth + PostgREST root with the publishable key. Optional: dedicated `health` Edge function for secrets-free DB ping if PostgREST root is too coarse.
- **Degraded-mode UX:** extend `src/lib/supabase-error-message.ts` + retry actions on critical flows (not only members list errors).

## Security

- **CSP:** follow [`ops/CSP_ROLLOUT.md`](CSP_ROLLOUT.md) (report-only → enforce).
- **Abuse:** rate limits on anonymous routes and Edge `co-trainer` (partially present); extend to other public surfaces as traffic grows.

## Performance / cost (Wave 4)

- Optional route-level Lighthouse CI or RUM budgets (`ops/ROUTE_PERF_BUDGETS.md`).
- Precomputed aggregates for dashboard tiles if RPC latency grows with data size.
