-- v2.1 + v2.2: Billing + Shop operational schema

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  plan_id text not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'paused')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  source text not null default 'stripe',
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, name)
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  category_id uuid references public.shop_categories(id) on delete set null,
  name text not null,
  description text,
  price_eur numeric(10,2) not null default 0,
  stock integer not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  product_id uuid not null references public.shop_products(id) on delete restrict,
  buyer_membership_id uuid references public.club_memberships(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  total_eur numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  ordered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
);

create index if not exists billing_subscriptions_club_idx on public.billing_subscriptions(club_id);
create index if not exists billing_events_club_idx on public.billing_events(club_id, created_at desc);
create index if not exists shop_categories_club_idx on public.shop_categories(club_id, is_active);
create index if not exists shop_products_club_idx on public.shop_products(club_id, is_active);
create index if not exists shop_orders_club_idx on public.shop_orders(club_id, ordered_at desc);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;

drop policy if exists billing_subscriptions_select_member on public.billing_subscriptions;
create policy billing_subscriptions_select_member
on public.billing_subscriptions
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists billing_subscriptions_manage_admin on public.billing_subscriptions;
create policy billing_subscriptions_manage_admin
on public.billing_subscriptions
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists billing_events_select_member on public.billing_events;
create policy billing_events_select_member
on public.billing_events
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists billing_events_manage_admin on public.billing_events;
create policy billing_events_manage_admin
on public.billing_events
for insert
to authenticated
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists shop_categories_select_member on public.shop_categories;
create policy shop_categories_select_member
on public.shop_categories
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists shop_categories_manage_admin on public.shop_categories;
create policy shop_categories_manage_admin
on public.shop_categories
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists shop_products_select_member on public.shop_products;
create policy shop_products_select_member
on public.shop_products
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists shop_products_manage_admin on public.shop_products;
create policy shop_products_manage_admin
on public.shop_products
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists shop_orders_select_member on public.shop_orders;
create policy shop_orders_select_member
on public.shop_orders
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists shop_orders_insert_member on public.shop_orders;
create policy shop_orders_insert_member
on public.shop_orders
for insert
to authenticated
with check (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists shop_orders_manage_admin on public.shop_orders;
create policy shop_orders_manage_admin
on public.shop_orders
for update
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create or replace function public.compute_shop_order_total()
returns trigger
language plpgsql
as $$
declare
  v_price numeric(10,2);
begin
  select price_eur into v_price from public.shop_products where id = new.product_id;
  new.total_eur := coalesce(v_price, 0) * greatest(new.quantity, 1);
  return new;
end;
$$;

drop trigger if exists trg_shop_orders_compute_total on public.shop_orders;
create trigger trg_shop_orders_compute_total
before insert or update of quantity, product_id
on public.shop_orders
for each row
execute function public.compute_shop_order_total();
