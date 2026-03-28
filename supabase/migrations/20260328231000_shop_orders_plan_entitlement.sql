-- Enforce shop feature at DB layer (aligns with plan-limits: Squad+ has shop, Kickoff does not).

create or replace function public.club_plan_includes_shop(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.billing_subscriptions b
    where b.club_id = _club_id
      and b.status in ('active', 'trialing')
      and lower(b.plan_id::text) in ('squad', 'pro', 'champions', 'bespoke')
  );
$$;

grant execute on function public.club_plan_includes_shop(uuid) to authenticated;

drop policy if exists shop_orders_insert_member on public.shop_orders;
create policy shop_orders_insert_member
on public.shop_orders
for insert
to authenticated
with check (
  public.is_member_of_club(auth.uid(), club_id)
  and public.club_plan_includes_shop(club_id)
);
