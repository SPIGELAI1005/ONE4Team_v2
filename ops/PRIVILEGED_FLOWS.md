# Privileged flows inventory (ST-002 / ST-003)

Server-side enforcement must apply even if the SPA hides a route.

| Flow | Enforcement |
|------|-------------|
| Platform admin dashboard | `is_platform_admin()` RPC; audit via `log_platform_admin_action` |
| Stripe webhook | Service role; idempotency + `stripe_processed_events` |
| `stripe-checkout` Edge | `is_club_admin` RPC + authenticated user |
| `co-trainer` Edge | JWT → `assertClubMember` / `assertClubAdmin`; plan feature `ai` |
| `chat-bridge` | Service role; bridge secrets for webhooks |
| Club LLM / storage uploads | RLS on tables + buckets per migrations |

## Deployment configuration

- **Edge CORS:** set `EDGE_ALLOWED_ORIGINS` in production (see `supabase/functions/_shared/cors.ts`). Wildcard fallback is for local dev only.
- **Correlation:** Edge handlers log with `resolveCorrelationId` / `logStructured` (`stripe-webhook`, `co-trainer`, `stripe-checkout`, `chat-bridge`). Prefer sending `x-correlation-id` from the client (`src/lib/observability.ts`).

## CI guardrails

`npm run guardrails` (production mode) blocks dev-login and feature-unlock env abuse. Edge secrets are validated at deploy time in your Supabase project settings, not in the Vite bundle.
