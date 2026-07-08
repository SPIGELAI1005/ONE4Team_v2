-- ONE4Team Control Center secure access foundation.
-- Platform roles are independent from club roles. Club Admin, Trainer,
-- Player, Parent, Partner, and other dashboard roles never grant /operator access.

create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_users_role_check') then
    alter table public.platform_users
      add constraint platform_users_role_check
      check (role in ('OWNER', 'OPERATOR', 'SUPPORT', 'VIEWER'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'platform_users_status_check') then
    alter table public.platform_users
      add constraint platform_users_status_check
      check (status in ('ACTIVE', 'DISABLED'));
  end if;
end $$;

create index if not exists idx_platform_users_status_role
  on public.platform_users (status, role);

alter table public.platform_users enable row level security;

-- Deny direct access by default. Authenticated clients use security-definer
-- functions below; writes should later go through audited OWNER-only RPCs.
drop policy if exists platform_users_no_direct_select on public.platform_users;
create policy platform_users_no_direct_select
on public.platform_users
for select
to authenticated
using (false);

create table if not exists public.platform_role_permissions (
  role text not null,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (role, permission)
);

alter table public.platform_role_permissions enable row level security;

drop policy if exists platform_role_permissions_no_direct_select on public.platform_role_permissions;
create policy platform_role_permissions_no_direct_select
on public.platform_role_permissions
for select
to authenticated
using (false);

insert into public.platform_role_permissions (role, permission)
values
  ('OWNER', 'operator.overview.read'),
  ('OWNER', 'operator.clubs.read'),
  ('OWNER', 'operator.clubs.manage'),
  ('OWNER', 'operator.modules.read'),
  ('OWNER', 'operator.modules.manage'),
  ('OWNER', 'operator.plans.read'),
  ('OWNER', 'operator.plans.manage'),
  ('OWNER', 'operator.users.read'),
  ('OWNER', 'operator.users.manage'),
  ('OWNER', 'operator.analytics.read'),
  ('OWNER', 'operator.support.use'),
  ('OWNER', 'operator.audit.read'),
  ('OWNER', 'operator.logs.read'),
  ('OWNER', 'operator.settings.read'),
  ('OWNER', 'operator.access.manage'),
  ('OPERATOR', 'operator.overview.read'),
  ('OPERATOR', 'operator.clubs.read'),
  ('OPERATOR', 'operator.clubs.manage'),
  ('OPERATOR', 'operator.modules.read'),
  ('OPERATOR', 'operator.modules.manage'),
  ('OPERATOR', 'operator.plans.read'),
  ('OPERATOR', 'operator.plans.manage'),
  ('OPERATOR', 'operator.users.read'),
  ('OPERATOR', 'operator.users.manage'),
  ('OPERATOR', 'operator.analytics.read'),
  ('OPERATOR', 'operator.support.use'),
  ('OPERATOR', 'operator.audit.read'),
  ('OPERATOR', 'operator.logs.read'),
  ('OPERATOR', 'operator.settings.read'),
  ('SUPPORT', 'operator.overview.read'),
  ('SUPPORT', 'operator.clubs.read'),
  ('SUPPORT', 'operator.modules.read'),
  ('SUPPORT', 'operator.plans.read'),
  ('SUPPORT', 'operator.users.read'),
  ('SUPPORT', 'operator.support.use'),
  ('SUPPORT', 'operator.audit.read'),
  ('SUPPORT', 'operator.logs.read'),
  ('SUPPORT', 'operator.settings.read'),
  ('VIEWER', 'operator.overview.read'),
  ('VIEWER', 'operator.clubs.read'),
  ('VIEWER', 'operator.modules.read'),
  ('VIEWER', 'operator.plans.read'),
  ('VIEWER', 'operator.users.read'),
  ('VIEWER', 'operator.analytics.read'),
  ('VIEWER', 'operator.audit.read'),
  ('VIEWER', 'operator.logs.read'),
  ('VIEWER', 'operator.settings.read')
on conflict (role, permission) do nothing;

create or replace function public.get_current_platform_user()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'is_platform_user', true,
        'id', pu.id,
        'auth_user_id', pu.auth_user_id,
        'email', pu.email,
        'role', pu.role,
        'status', pu.status,
        'permissions', coalesce(
          (
            select jsonb_agg(prp.permission order by prp.permission)
            from public.platform_role_permissions prp
            where prp.role = pu.role
          ),
          '[]'::jsonb
        )
      )
      from public.platform_users pu
      where pu.auth_user_id = auth.uid()
        and pu.status = 'ACTIVE'
      limit 1
    ),
    jsonb_build_object(
      'is_platform_user', false,
      'id', null,
      'auth_user_id', auth.uid(),
      'email', null,
      'role', null,
      'status', null,
      'permissions', '[]'::jsonb
    )
  );
$$;

create or replace function public.can_view_platform()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_users pu
    join public.platform_role_permissions prp on prp.role = pu.role
    where pu.auth_user_id = auth.uid()
      and pu.status = 'ACTIVE'
      and prp.permission = 'operator.overview.read'
  );
$$;

create or replace function public.can_manage_platform()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_users pu
    where pu.auth_user_id = auth.uid()
      and pu.status = 'ACTIVE'
      and pu.role in ('OWNER', 'OPERATOR')
  );
$$;

create or replace function public.require_platform_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
begin
  current_platform_user := public.get_current_platform_user();

  if coalesce((current_platform_user ->> 'is_platform_user')::boolean, false) is not true then
    raise exception 'Platform access required' using errcode = '42501';
  end if;

  return current_platform_user;
end;
$$;

create or replace function public.require_platform_permission(_permission text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
begin
  current_platform_user := public.require_platform_access();

  if not exists (
    select 1
    from public.platform_role_permissions prp
    where prp.role = current_platform_user ->> 'role'
      and prp.permission = _permission
  ) then
    raise exception 'Platform permission required' using errcode = '42501';
  end if;

  return current_platform_user;
end;
$$;

create or replace function public.get_platform_operator_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.get_current_platform_user();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_platform();
$$;

revoke all on function public.get_current_platform_user() from public;
revoke all on function public.can_view_platform() from public;
revoke all on function public.can_manage_platform() from public;
revoke all on function public.require_platform_access() from public;
revoke all on function public.require_platform_permission(text) from public;
revoke all on function public.get_platform_operator_access() from public;
revoke all on function public.is_platform_admin() from public;

grant execute on function public.get_current_platform_user() to authenticated;
grant execute on function public.can_view_platform() to authenticated;
grant execute on function public.can_manage_platform() to authenticated;
grant execute on function public.require_platform_access() to authenticated;
grant execute on function public.require_platform_permission(text) to authenticated;
grant execute on function public.get_platform_operator_access() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
