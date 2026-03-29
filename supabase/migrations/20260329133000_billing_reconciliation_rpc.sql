-- ST-011: Replay-safe audit trail read for platform ops (Stripe vs billing_events).

create or replace function public.get_billing_reconciliation_snapshot()
returns table (
  club_id uuid,
  subscription_status text,
  subscription_updated_at timestamptz,
  last_billing_event_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    return;
  end if;

  return query
  select
    b.club_id,
    b.status::text,
    b.updated_at,
    (
      select max(be.created_at)
      from public.billing_events be
      where be.club_id = b.club_id
    ) as last_billing_event_at,
    b.stripe_customer_id,
    b.stripe_subscription_id
  from public.billing_subscriptions b
  order by b.updated_at desc nulls last;
end;
$$;

revoke all on function public.get_billing_reconciliation_snapshot() from public;
grant execute on function public.get_billing_reconciliation_snapshot() to authenticated;

comment on function public.get_billing_reconciliation_snapshot() is
  'Platform-admin snapshot for billing lag detection. Alert if active subscription and last_billing_event_at is null or very stale vs Stripe dashboard.';
