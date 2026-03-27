-- Add Stripe-specific columns to billing_subscriptions (each checked independently)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_subscriptions'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.billing_subscriptions ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_subscriptions'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.billing_subscriptions ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_subscriptions'
      AND column_name = 'current_period_start'
  ) THEN
    ALTER TABLE public.billing_subscriptions ADD COLUMN current_period_start timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_subscriptions'
      AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.billing_subscriptions ADD COLUMN current_period_end timestamptz;
  END IF;
END $$;

-- Add columns to billing_events (each checked independently)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events'
      AND column_name = 'stripe_event_id'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN stripe_event_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events'
      AND column_name = 'payload'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN payload jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_billing_sub_stripe_sub_id
  ON public.billing_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_sub_stripe_cust_id
  ON public.billing_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
