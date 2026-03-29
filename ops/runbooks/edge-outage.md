# Runbook: Edge Functions outage / 5xx burst

**Owner:** Platform / Edge DRI  
**Severity triggers:** Elevated 5xx on `functions/v1/*`; Stripe or chat-bridge failures; regional Deno deploy issues.

## Immediate

1. Supabase Dashboard → **Edge Functions** → logs (filter by function name).
2. Correlate with deploy timeline; roll back last function bundle if suspect.
3. For **stripe-webhook**: confirm Stripe Dashboard delivery retries; use `x-correlation-id` response header to grep logs.
4. Verify secrets: `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, third-party API keys.

## Mitigation

- Disable non-critical functions via feature flags / routing if applicable.
- Increase Stripe webhook tolerance: ensure idempotency table (`stripe_processed_events`) healthy — duplicate 200s are OK.

## Validation

- Synthetic `POST` to health/guarded function with valid JWT (internal script).
- Error rate < 1% over 15 minutes.

## Follow-up

- Add structured JSON logs (see `_shared/request_context.ts`).
- Tighten `EDGE_ALLOWED_ORIGINS` in production.
