-- Internal ONE4Team operator view of a single club.
-- Platform access only; club membership must never grant access to this RPC.

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
          'source', coalesce(ee.source, 'PLAN')
        )
        order by m.category, m.name
      )
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

revoke all on function public.get_operator_club_detail(uuid) from public;
grant execute on function public.get_operator_club_detail(uuid) to authenticated;

create or replace function public.get_operator_clubs()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', club_row.id,
        'name', club_row.name,
        'slug', club_row.slug,
        'status', club_row.status,
        'plan_name', club_row.plan_name,
        'billing_status', club_row.billing_status,
        'created_at', club_row.created_at,
        'updated_at', club_row.updated_at
      )
      order by club_row.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select
      c.id,
      c.name,
      c.slug,
      coalesce(c.status, 'ACTIVE') as status,
      coalesce(pl.name, bs.plan_id) as plan_name,
      bs.status as billing_status,
      c.created_at,
      c.updated_at
    from public.clubs c
    left join public.billing_subscriptions bs on bs.club_id = c.id
    left join public.plans pl on pl.key = bs.plan_id
    order by c.created_at desc
    limit 200
  ) club_row
  where (public.require_platform_permission('operator.clubs.read') ->> 'is_platform_user')::boolean;
$$;

revoke all on function public.get_operator_clubs() from public;
grant execute on function public.get_operator_clubs() to authenticated;
