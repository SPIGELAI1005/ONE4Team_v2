-- Global module registry and plan-module mapping management for the Control Center.
-- Manual club overrides in club_module_entitlements are never modified by these RPCs.

create or replace function public.audit_plan_module_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_reason text;
begin
  if auth.uid() is null then
    return new;
  end if;

  audit_reason := nullif(current_setting('app.platform_audit_reason', true), '');

  if tg_op = 'INSERT' then
    perform public.append_audit_log(
      'PLAN_MODULE_CHANGED',
      'plan_module',
      new.id::text,
      null,
      null,
      to_jsonb(new),
      audit_reason
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.included is distinct from new.included then
    perform public.append_audit_log(
      'PLAN_MODULE_CHANGED',
      'plan_module',
      new.id::text,
      null,
      to_jsonb(old),
      to_jsonb(new),
      audit_reason
    );
  elsif tg_op = 'UPDATE' then
    perform public.append_audit_log(
      'PLAN_CHANGED',
      'plan_module',
      new.id::text,
      null,
      to_jsonb(old),
      to_jsonb(new),
      audit_reason
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_plan_modules_change on public.plan_modules;
create trigger audit_plan_modules_change
after insert or update
on public.plan_modules
for each row execute function public.audit_plan_module_change();

create or replace function public.upsert_platform_module(
  _key text,
  _name text,
  _description text default null,
  _category text default 'core',
  _is_core boolean default false,
  _is_billable boolean default false,
  _default_enabled boolean default false,
  _status text default 'ACTIVE',
  _module_id uuid default null
)
returns public.modules
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  before_row public.modules%rowtype;
  after_row public.modules%rowtype;
  audit_action text;
begin
  current_platform_user := public.require_platform_permission('operator.modules.manage');

  if coalesce(current_platform_user ->> 'role', '') <> 'OWNER' then
    raise exception 'Only OWNER can create or edit modules.' using errcode = '42501';
  end if;

  if _status not in ('ACTIVE', 'INACTIVE', 'DEPRECATED') then
    raise exception 'Invalid module status.' using errcode = '22023';
  end if;

  if _module_id is null then
    insert into public.modules (
      key,
      name,
      description,
      category,
      is_core,
      is_billable,
      default_enabled,
      status
    )
    values (
      lower(trim(_key)),
      trim(_name),
      nullif(trim(_description), ''),
      coalesce(nullif(trim(_category), ''), 'core'),
      _is_core,
      _is_billable,
      _default_enabled,
      _status
    )
    returning * into after_row;

    perform public.append_audit_log(
      'MODULE_CREATED',
      'module',
      after_row.id::text,
      null,
      null,
      to_jsonb(after_row),
      'Module created in platform catalog.'
    );

    return after_row;
  end if;

  select * into before_row from public.modules where id = _module_id;
  if not found then
    raise exception 'Module not found.' using errcode = 'P0002';
  end if;

  update public.modules
  set
    key = lower(trim(_key)),
    name = trim(_name),
    description = nullif(trim(_description), ''),
    category = coalesce(nullif(trim(_category), ''), 'core'),
    is_core = _is_core,
    is_billable = _is_billable,
    default_enabled = _default_enabled,
    status = _status,
    updated_at = now()
  where id = _module_id
  returning * into after_row;

  audit_action := case
    when before_row.status is distinct from after_row.status and after_row.status in ('INACTIVE', 'DEPRECATED')
      then 'MODULE_DEPRECATED'
    else 'MODULE_UPDATED'
  end;

  perform public.append_audit_log(
    audit_action,
    'module',
    after_row.id::text,
    null,
    to_jsonb(before_row),
    to_jsonb(after_row),
    'Module updated in platform catalog.'
  );

  return after_row;
end;
$$;

create or replace function public.upsert_platform_plan(
  _key text,
  _name text,
  _description text default null,
  _price_monthly numeric default null,
  _price_yearly numeric default null,
  _max_users integer default null,
  _max_teams integer default null,
  _status text default 'ACTIVE',
  _plan_id uuid default null
)
returns public.plans
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  before_row public.plans%rowtype;
  after_row public.plans%rowtype;
  audit_action text;
begin
  current_platform_user := public.require_platform_permission('operator.plans.manage');

  if coalesce(current_platform_user ->> 'role', '') <> 'OWNER' then
    raise exception 'Only OWNER can create or edit plans.' using errcode = '42501';
  end if;

  if _status not in ('ACTIVE', 'INACTIVE', 'ARCHIVED') then
    raise exception 'Invalid plan status.' using errcode = '22023';
  end if;

  if _plan_id is null then
    insert into public.plans (
      key,
      name,
      description,
      price_monthly,
      price_yearly,
      max_users,
      max_teams,
      status
    )
    values (
      lower(trim(_key)),
      trim(_name),
      nullif(trim(_description), ''),
      _price_monthly,
      _price_yearly,
      _max_users,
      _max_teams,
      _status
    )
    returning * into after_row;

    perform public.append_audit_log(
      'PLAN_CREATED',
      'plan',
      after_row.id::text,
      null,
      null,
      to_jsonb(after_row),
      'Plan created in platform catalog.'
    );

    return after_row;
  end if;

  select * into before_row from public.plans where id = _plan_id;
  if not found then
    raise exception 'Plan not found.' using errcode = 'P0002';
  end if;

  update public.plans
  set
    key = lower(trim(_key)),
    name = trim(_name),
    description = nullif(trim(_description), ''),
    price_monthly = _price_monthly,
    price_yearly = _price_yearly,
    max_users = _max_users,
    max_teams = _max_teams,
    status = _status,
    updated_at = now()
  where id = _plan_id
  returning * into after_row;

  audit_action := case
    when before_row.status is distinct from after_row.status and after_row.status in ('INACTIVE', 'ARCHIVED')
      then 'PLAN_DEPRECATED'
    else 'PLAN_UPDATED'
  end;

  perform public.append_audit_log(
    audit_action,
    'plan',
    after_row.id::text,
    null,
    to_jsonb(before_row),
    to_jsonb(after_row),
    'Plan updated in platform catalog.'
  );

  return after_row;
end;
$$;

create or replace function public.set_platform_plan_module(
  _plan_id uuid,
  _module_id uuid,
  _included boolean,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement_row public.plan_modules%rowtype;
begin
  perform public.require_platform_permission('operator.plans.manage');

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.plans where id = _plan_id) then
    raise exception 'Plan not found.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.modules where id = _module_id) then
    raise exception 'Module not found.' using errcode = 'P0002';
  end if;

  perform set_config('app.platform_audit_reason', trim(_reason), true);

  insert into public.plan_modules (plan_id, module_id, included, limits_json)
  values (_plan_id, _module_id, _included, '{}'::jsonb)
  on conflict (plan_id, module_id)
  do update set
    included = excluded.included,
    updated_at = now()
  returning * into entitlement_row;

  return jsonb_build_object(
    'plan_id', entitlement_row.plan_id,
    'module_id', entitlement_row.module_id,
    'included', entitlement_row.included,
    'updated_at', entitlement_row.updated_at
  );
end;
$$;

create or replace function public.get_platform_plan_matrix()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'modules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'key', m.key,
          'name', m.name,
          'category', m.category,
          'status', m.status
        )
        order by m.category, m.name
      )
      from public.modules m
      where m.status <> 'DEPRECATED'
    ), '[]'::jsonb),
    'plans', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'key', p.key,
          'name', p.name,
          'status', p.status
        )
        order by p.price_yearly nulls last, p.name
      )
      from public.plans p
      where p.status <> 'ARCHIVED'
    ), '[]'::jsonb),
    'cells', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'plan_id', pm.plan_id,
          'module_id', pm.module_id,
          'included', pm.included
        )
      )
      from public.plan_modules pm
      join public.plans p on p.id = pm.plan_id and p.status <> 'ARCHIVED'
      join public.modules m on m.id = pm.module_id and m.status <> 'DEPRECATED'
    ), '[]'::jsonb)
  )
  where (public.require_platform_permission('operator.plans.read') ->> 'is_platform_user')::boolean;
$$;

revoke all on function public.upsert_platform_module(text, text, text, text, boolean, boolean, boolean, text, uuid) from public;
revoke all on function public.upsert_platform_plan(text, text, text, numeric, numeric, integer, integer, text, uuid) from public;
revoke all on function public.set_platform_plan_module(uuid, uuid, boolean, text) from public;
revoke all on function public.get_platform_plan_matrix() from public;

grant execute on function public.upsert_platform_module(text, text, text, text, boolean, boolean, boolean, text, uuid) to authenticated;
grant execute on function public.upsert_platform_plan(text, text, text, numeric, numeric, integer, integer, text, uuid) to authenticated;
grant execute on function public.set_platform_plan_module(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.get_platform_plan_matrix() to authenticated;
