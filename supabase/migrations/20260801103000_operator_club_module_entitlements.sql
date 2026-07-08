-- Operator module entitlement management for the Control Center club detail page.
-- Every change is audited via triggers on public.club_module_entitlements.

create or replace function public.audit_club_module_entitlement_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_audit_log(
      case when new.enabled then 'MODULE_ENABLED' else 'MODULE_DISABLED' end,
      'club_module_entitlement',
      new.id::text,
      new.club_id,
      null,
      to_jsonb(new),
      new.reason
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.enabled is distinct from new.enabled then
    perform public.append_audit_log(
      case when new.enabled then 'MODULE_ENABLED' else 'MODULE_DISABLED' end,
      'club_module_entitlement',
      new.id::text,
      new.club_id,
      to_jsonb(old),
      to_jsonb(new),
      new.reason
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    old.source is distinct from new.source
    or old.reason is distinct from new.reason
    or old.valid_until is distinct from new.valid_until
  ) then
    perform public.append_audit_log(
      'MODULE_OVERRIDE_UPDATED',
      'club_module_entitlement',
      new.id::text,
      new.club_id,
      to_jsonb(old),
      to_jsonb(new),
      new.reason
    );
  end if;

  return new;
end;
$$;

create or replace function public.set_operator_club_module_entitlement(
  _club_id uuid,
  _module_id uuid,
  _enabled boolean,
  _source text,
  _reason text,
  _valid_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_platform_user jsonb;
  module_row public.modules%rowtype;
  entitlement_row public.club_module_entitlements%rowtype;
  included_in_plan boolean;
begin
  current_platform_user := public.require_platform_permission('operator.modules.manage');

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _source not in ('MANUAL_OVERRIDE', 'TRIAL', 'PROMOTION', 'SUPPORT', 'SYSTEM') then
    raise exception 'Invalid entitlement source.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.clubs where id = _club_id) then
    raise exception 'Club not found.' using errcode = 'P0002';
  end if;

  select *
  into module_row
  from public.modules
  where id = _module_id
    and status = 'ACTIVE';

  if not found then
    raise exception 'Module not found.' using errcode = 'P0002';
  end if;

  if module_row.is_core and _enabled = false and coalesce(current_platform_user ->> 'role', '') <> 'OWNER' then
    raise exception 'Only OWNER can disable core modules.' using errcode = '42501';
  end if;

  insert into public.club_module_entitlements (
    club_id,
    module_id,
    enabled,
    source,
    reason,
    valid_until,
    changed_by
  )
  values (
    _club_id,
    _module_id,
    _enabled,
    _source,
    trim(_reason),
    _valid_until,
    auth.uid()
  )
  on conflict (club_id, module_id, source)
  do update set
    enabled = excluded.enabled,
    reason = excluded.reason,
    valid_until = excluded.valid_until,
    changed_by = auth.uid(),
    updated_at = now()
  returning *
  into entitlement_row;

  select exists (
    select 1
    from public.billing_subscriptions bs
    join public.plans pl on pl.key = bs.plan_id
    join public.plan_modules pm on pm.plan_id = pl.id and pm.module_id = module_row.id and pm.included = true
    where bs.club_id = _club_id
  )
  into included_in_plan;

  return jsonb_build_object(
    'id', module_row.id,
    'key', module_row.key,
    'name', module_row.name,
    'description', module_row.description,
    'category', module_row.category,
    'is_core', module_row.is_core,
    'enabled', entitlement_row.enabled,
    'source', entitlement_row.source,
    'included_in_plan', included_in_plan,
    'valid_until', entitlement_row.valid_until,
    'changed_by', entitlement_row.changed_by,
    'changed_by_email', (select email from auth.users where id = entitlement_row.changed_by),
    'changed_at', entitlement_row.updated_at,
    'entitlement_id', entitlement_row.id
  );
end;
$$;

revoke all on function public.set_operator_club_module_entitlement(uuid, uuid, boolean, text, text, timestamptz) from public;
grant execute on function public.set_operator_club_module_entitlement(uuid, uuid, boolean, text, text, timestamptz) to authenticated;

-- Expand module payload returned by the club detail RPC.
create or replace function public.get_operator_club_detail(_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  perform public.require_platform_permission('operator.clubs.read');

  select jsonb_build_object(
    'club', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug,
      'status', coalesce(c.status, 'ACTIVE'),
      'email', c.email,
      'phone', c.phone,
      'is_public', c.is_public,
      'public_page_published_at', c.public_page_published_at,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'last_activity_at', greatest(
        c.updated_at,
        coalesce((select max(cm.updated_at) from public.club_memberships cm where cm.club_id = c.id), c.updated_at),
        coalesce((select max(e.updated_at) from public.events e where e.club_id = c.id), c.updated_at),
        coalesce((select max(m.updated_at) from public.matches m where m.club_id = c.id), c.updated_at)
      )
    ),
    'plan', (
      select jsonb_build_object(
        'key', coalesce(pl.key, bs.plan_id),
        'name', coalesce(pl.name, bs.plan_id),
        'billing_status', bs.status,
        'billing_cycle', bs.billing_cycle
      )
      from public.billing_subscriptions bs
      left join public.plans pl on pl.key = bs.plan_id
      where bs.club_id = c.id
      limit 1
    ),
    'public_url', case
      when c.is_public and c.slug is not null and length(trim(c.slug)) > 0 then '/club/' || c.slug
      else null
    end,
    'metrics', jsonb_build_object(
      'users', (select count(*)::integer from public.club_memberships cm where cm.club_id = c.id),
      'active_users', (
        select count(*)::integer
        from public.club_memberships cm
        join public.profiles p on p.user_id = cm.user_id
        where cm.club_id = c.id
          and p.updated_at >= now() - interval '7 days'
      ),
      'teams', (select count(*)::integer from public.teams t where t.club_id = c.id),
      'events', (select count(*)::integer from public.events e where e.club_id = c.id),
      'matches', (select count(*)::integer from public.matches m where m.club_id = c.id)
    ),
    'active_modules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key', module_row.module_key,
          'name', module_row.module_name,
          'source', module_row.source
        )
        order by module_row.module_name
      )
      from (
        select
          m.key as module_key,
          m.name as module_name,
          coalesce(ee.source, 'PLAN') as source
        from public.modules m
        left join lateral (
          select cme.enabled, cme.source
          from public.club_module_entitlements cme
          where cme.club_id = c.id
            and cme.module_id = m.id
            and (cme.valid_until is null or cme.valid_until > now())
          order by cme.updated_at desc
          limit 1
        ) ee on true
        where m.status = 'ACTIVE'
          and coalesce(ee.enabled, m.default_enabled) = true
      ) module_row
    ), '[]'::jsonb),
    'modules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'key', m.key,
          'name', m.name,
          'description', m.description,
          'category', m.category,
          'is_core', m.is_core,
          'enabled', coalesce(ee.enabled, m.default_enabled),
          'source', coalesce(ee.source, 'PLAN'),
          'included_in_plan', exists (
            select 1
            from public.billing_subscriptions bs
            join public.plans pl on pl.key = bs.plan_id
            join public.plan_modules pm on pm.plan_id = pl.id and pm.module_id = m.id and pm.included = true
            where bs.club_id = c.id
          ),
          'valid_until', ee.valid_until,
          'changed_by', ee.changed_by,
          'changed_by_email', ee.changed_by_email,
          'changed_at', ee.changed_at,
          'entitlement_id', ee.entitlement_id
        )
        order by m.category, m.name
      )
      from public.modules m
      left join lateral (
        select
          cme.enabled,
          cme.source,
          cme.valid_until,
          cme.changed_by,
          cme.updated_at as changed_at,
          cme.id as entitlement_id,
          changer.email as changed_by_email
        from public.club_module_entitlements cme
        left join auth.users changer on changer.id = cme.changed_by
        where cme.club_id = c.id
          and cme.module_id = m.id
          and (cme.valid_until is null or cme.valid_until > now())
        order by cme.updated_at desc
        limit 1
      ) ee on true
      where m.status = 'ACTIVE'
    ), '[]'::jsonb),
    'users', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'membership_id', cm.id,
          'user_id', cm.user_id,
          'name', coalesce(p.display_name, u.email, 'Unknown user'),
          'email', u.email,
          'role', cm.role,
          'status', cm.status,
          'last_active_at', p.updated_at
        )
        order by cm.created_at desc
      )
      from public.club_memberships cm
      join auth.users u on u.id = cm.user_id
      left join public.profiles p on p.user_id = cm.user_id
      where cm.club_id = c.id
    ), '[]'::jsonb),
    'usage', jsonb_build_object(
      'active_users', (
        select count(*)::integer
        from public.club_memberships cm
        join public.profiles p on p.user_id = cm.user_id
        where cm.club_id = c.id
          and p.updated_at >= now() - interval '7 days'
      ),
      'module_usage', (
        select count(*)::integer
        from public.modules m
        left join lateral (
          select cme.enabled
          from public.club_module_entitlements cme
          where cme.club_id = c.id
            and cme.module_id = m.id
            and (cme.valid_until is null or cme.valid_until > now())
          order by cme.updated_at desc
          limit 1
        ) ee on true
        where m.status = 'ACTIVE'
          and coalesce(ee.enabled, m.default_enabled) = true
      ),
      'events_created', (select count(*)::integer from public.events e where e.club_id = c.id),
      'matches_created', (select count(*)::integer from public.matches m where m.club_id = c.id),
      'page_views', null,
      'page_views_available', false
    ),
    'recent_activity', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', al.id,
          'action', al.action,
          'actor_email', al.actor_email,
          'entity_type', al.entity_type,
          'created_at', al.created_at
        )
        order by al.created_at desc
      )
      from (
        select *
        from public.audit_logs
        where club_id = c.id
        order by created_at desc
        limit 8
      ) al
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', al.id,
          'action', al.action,
          'actor_email', al.actor_email,
          'actor_role', al.actor_role,
          'entity_type', al.entity_type,
          'entity_id', al.entity_id,
          'reason', al.reason,
          'created_at', al.created_at
        )
        order by al.created_at desc
      )
      from (
        select *
        from public.audit_logs
        where club_id = c.id
        order by created_at desc
        limit 50
      ) al
    ), '[]'::jsonb),
    'support_notes', '[]'::jsonb,
    'generated_at', now()
  )
  into result
  from public.clubs c
  where c.id = _club_id;

  if result is null then
    raise exception 'Club not found' using errcode = 'P0002';
  end if;

  return result;
end;
$$;
