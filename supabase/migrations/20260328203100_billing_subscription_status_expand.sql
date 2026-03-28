-- Align billing_subscriptions.status with Stripe lifecycle + existing checkout "incomplete" writes.
ALTER TABLE public.billing_subscriptions
  DROP CONSTRAINT IF EXISTS billing_subscriptions_status_check;

ALTER TABLE public.billing_subscriptions
  ADD CONSTRAINT billing_subscriptions_status_check
  CHECK (
    status IN (
      'trialing',
      'active',
      'past_due',
      'cancelled',
      'paused',
      'canceled',
      'incomplete'
    )
  );
