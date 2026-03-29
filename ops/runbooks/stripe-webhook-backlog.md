# Runbook: Stripe webhook backlog / billing drift

**Owner:** Billing DRI + Platform  
**Severity triggers:** Stripe shows failing webhook deliveries; clubs report wrong plan; `billing_events` stale vs Stripe.

## Immediate

1. Stripe Dashboard → **Developers → Webhooks** → recent failures (HTTP status, response body).
2. Search Edge logs by `stripe_event_id` and `x-correlation-id` from Stripe delivery detail.
3. Run reconciliation (platform admin JWT in app or SQL):

   - RPC: `get_billing_reconciliation_snapshot()` — compare `last_billing_event_at` vs Stripe subscription timeline.

## Replay / recovery

- **Safe replay:** Stripe “Resend event” for a given id — idempotency via `stripe_processed_events` + unique `billing_events.stripe_event_id`.
- If handler threw after partial writes: fix code, release stale claim (row in `stripe_processed_events` for that id), then resend from Stripe.
- **Never** duplicate manual inserts into `billing_events` without a unique `stripe_event_id`.

## Alerting (recommended) — T-034

Wire at least one path your on-call actually receives:

1. **Stripe Dashboard:** Webhook endpoint → alert on failure rate or consecutive `4xx`/`5xx` (email or Slack if connected).
2. **Edge logs (Supabase):** Saved search / export for substring `Stripe webhook handler failed` or `level":"error"` with `facet":"stripe_webhook"`; optional log drain to Datadog/Loki with a threshold rule.
3. **Reconciliation drift:** Schedule a read of `get_billing_reconciliation_snapshot()` (scripted or SQL job) and alert when rows exceed a baseline “suspect” count or when `last_billing_event_at` is null for `active` subscriptions older than 7 days.
4. **Pager:** Route billing alerts to the same rotation as payment incidents (see [`SECTION_L_MONITORING_SETUP.md`](../SECTION_L_MONITORING_SETUP.md)).

Also:

- Log-based alert on JSON log `Stripe webhook handler failed` (see `stripe-webhook/index.ts`).
- Daily check: active subscriptions with `last_billing_event_at` null > 7d (investigate).
- Compare `get_billing_reconciliation_snapshot()` to Stripe: alert on sustained mismatch count (ST-011).

## Replay automation (checklist)

Run after code fixes or Stripe-side incidents:

1. `node scripts/stripe-replay-checklist.cjs` — prints ordered steps (no Stripe API calls).
2. In Stripe Dashboard → Webhooks → failed delivery → **Resend** (or Events → Replay) for the target `event_id`.
3. Confirm Edge logs show success for the same `stripe_event_id` / `x-correlation-id`.
4. Re-run reconciliation RPC; target club `billing_subscriptions` matches Stripe.

## Validation

- Target club shows correct `billing_subscriptions.status` and recent `billing_events` row for the replayed event type.
