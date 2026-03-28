# Production readiness artifacts (ONE4Team)

Last updated: 2026-03-29 (synced with `CHANGELOG.md` / `MEMORY_BANK.md` public club + Stripe bundle).

Companion to the engineering audit. Keep dates and owners in your ticket system.

## Go-live checklist (pass/fail)

| # | Criterion | Pass |
|---|-----------|------|
| 1 | `VITE_SUPABASE_*` and Stripe publishable key set on hosting; no secrets in client bundle except anon/publishable | ☐ |
| 2 | Supabase Edge secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`; production `EDGE_ALLOWED_ORIGINS` (no wildcard) | ☐ |
| 3 | Edge secrets `STRIPE_PRICE_*` set for every plan/cycle (or consciously `STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS` only in sandbox) | ☐ |
| 4 | Webhook endpoint registered in Stripe live mode; `stripe_processed_events` migration applied | ☐ |
| 5 | RLS migrations applied including `shop_orders` plan entitlement | ☐ |
| 6 | `VITE_PLATFORM_ADMIN_EMAILS` set or intentionally empty (fail closed) | ☐ |
| 7 | `VITE_DEV_UNLOCK_ALL_FEATURES` not `true` in any production build | ☐ |
| 8 | Sentry DSN set or consciously disabled | ☐ |
| 9 | Smoke: `npm run ci` green; k6 `npm run k6:smoke` against staging | ☐ |
| 10 | Rollback: previous Vercel deployment ready to promote; Supabase migrations reversible or forward-fix documented | ☐ |

## Rollback checklist

1. Freeze deploys; mark incident channel.
2. Vercel: instant rollback to prior **Production** deployment.
3. Supabase: avoid destructive down migrations in incident window; prefer feature flags or hotfix migration.
4. Stripe: if bad prices went live, disable new Checkout sessions in Dashboard or rotate webhook handling.
5. Post-mortem: capture logs (Supabase Edge, Vercel), Stripe event IDs, Sentry issues.

## Monitoring checklist

- [ ] Sentry: alert rules on new issue spike or error rate.
- [ ] Supabase Dashboard: database CPU, connection count, API 4xx/5xx.
- [ ] Supabase Edge Functions: invocations, errors, duration (co-trainer, stripe-webhook).
- [ ] Stripe Dashboard: webhook delivery failures.
- [ ] Uptime: synthetic check on `/health` (SPA + auth health probe).
- [ ] Optional: log drain from Supabase to your SIEM; no PII in client logs.

## Load-testing plan (staging)

| Phase | Approx concurrent users | Goal | k6 |
|-------|-------------------------|------|-----|
| 1 | 10 | Baseline latency, auth + REST | `k6 run --vus 10 --duration 2m k6/smoke.js` |
| 2 | 100 | PostgREST saturation, connection limits | `k6 run --vus 100 --duration 5m k6/journeys-critical.js` |
| 3 | 500 | Same + observe DB CPU | scale VUs; watch Supabase metrics |
| 4 | 1 000 | Identify hot tables / missing indexes | profile slow queries in Dashboard |
| 5 | 10 000 | **Only with approval**; expect Realtime and Edge quotas to dominate | staged ramp; cap Edge LLM separately |

**Note:** LLM Edge functions are cost- and quota-sensitive; use `K6_RUN_EDGE=1` sparingly and low VUs.

## Remediation backlog (by sprint) — template

**Sprint 1 (ship blockers)**  
- Stripe: set `STRIPE_PRICE_*` secrets on `stripe-checkout`; webhook uses claim-first + 503 defer for in-flight duplicates; `EDGE_ALLOWED_ORIGINS` lockdown.  
- Deploy plan entitlement fixes (Edge + shop RLS).  
- PlanGate loading no longer renders paid surfaces before subscription load.

**Sprint 2 (scale)**  
- Platform admin: server-enforced `is_platform_admin` RPC or Edge-only aggregate.  
- Realtime: cap channels per user / batch subscriptions.  
- Query audit: `.select('*')`, unbounded lists, add limits + indexes.

**Sprint 3 (resilience)**  
- Webhook idempotency hardening (claim row + transactional semantics if needed).  
- Circuit breaker / timeouts on all third-party calls from Edge.  
- CSP and stricter security headers after nonce/hashing strategy for Vite.
