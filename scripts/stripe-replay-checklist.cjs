#!/usr/bin/env node
/* Stripe webhook replay checklist (ST-011) — prints steps only; no API calls. */

const steps = [
  "1. Open Stripe Dashboard → Developers → Webhooks (or Events).",
  "2. Find the failed delivery or event id; copy stripe_event_id and note x-correlation-id from response body if logged.",
  "3. Fix root cause (code deploy, secret, idempotency row) per ops/runbooks/stripe-webhook-backlog.md.",
  "4. Use Stripe 'Resend' / replay for that event id (idempotent handler).",
  "5. Tail Edge logs: expect structured success log with same stripe_event_id.",
  "6. Run get_billing_reconciliation_snapshot() and verify club billing rows vs Stripe.",
];

console.log("Stripe replay checklist:\n");
for (const s of steps) console.log(s);
