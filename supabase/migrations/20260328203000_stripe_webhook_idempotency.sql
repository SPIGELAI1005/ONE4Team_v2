-- Idempotent Stripe webhook processing: at-most-once marker after successful handling.
-- Service role only (no RLS policies = deny for anon/authenticated).

create table if not exists public.stripe_processed_events (
  stripe_event_id text primary key,
  processed_at timestamptz not null default now()
);

create index if not exists idx_stripe_processed_events_processed_at
  on public.stripe_processed_events (processed_at desc);

alter table public.stripe_processed_events enable row level security;

-- Prevent duplicate billing audit rows for the same Stripe event id
create unique index if not exists billing_events_stripe_event_id_key
  on public.billing_events (stripe_event_id)
  where stripe_event_id is not null;
