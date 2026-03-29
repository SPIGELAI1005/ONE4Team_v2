-- Platform admin RBAC with backend-enforced access checks.
-- This removes reliance on client-side email allowlists.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.platform_admins enable row level security;

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists clubs_select_platform_admin on public.clubs;
create policy clubs_select_platform_admin
on public.clubs
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists billing_subscriptions_select_platform_admin on public.billing_subscriptions;
create policy billing_subscriptions_select_platform_admin
on public.billing_subscriptions
for select
to authenticated
using (public.is_platform_admin());
