# Stripe member-based billing

Checkout must charge **base + per active member**, matching [`calculateCatalogPrice`](../src/lib/plan-catalog.ts).

## Edge secrets (preferred)

For each of `KICKOFF`, `SQUAD`, `PRO`, `CHAMPIONS` and each of `MONTHLY`, `YEARLY`:

- `STRIPE_PRICE_{PLAN}_{CYCLE}_BASE`
- `STRIPE_PRICE_{PLAN}_{CYCLE}_MEMBER`

Example: `STRIPE_PRICE_SQUAD_MONTHLY_BASE`, `STRIPE_PRICE_SQUAD_MONTHLY_MEMBER`.

Legacy single-price secrets `STRIPE_PRICE_{PLAN}_{CYCLE}` still work as **base-only** (member line omitted) with a warning.

Sandbox: `STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS=true`.

## Checkout behaviour

- Line item 0: base price, quantity `1`  
- Line item 1: member price, quantity = **server-validated** billable member count (max of DB active memberships and requested count, capped by plan max)  
- Kick-off Founding Club redemption **must not** create a Checkout Session  
- Stripe failures must **not** upsert a client trial  

## Deploy

```bash
supabase functions deploy stripe-checkout
supabase functions deploy process-commercial-offers
supabase db push
```
