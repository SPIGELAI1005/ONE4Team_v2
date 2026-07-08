-- Global operator audit trail with filters, enriched display fields, and OWNER-only metadata.

create or replace function public.resolve_audit_entity_name(
  _entity_type text,
  _entity_id text,
  _after_json jsonb default null
)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    case _entity_type
      when 'club' then (select c.name from public.clubs c where c.id::text = _entity_id limit 1)
      when 'module' then (select m.name from public.modules m where m.id::text = _entity_id limit 1)
      when 'plan' then (select p.name from public.plans p where p.id::text = _entity_id limit 1)
      when 'club_module_entitlement' then coalesce(
        _after_json ->> 'module_key',
        (select m.name from public.modules m where m.id::text = coalesce(_after_json ->> 'module_id', '') limit 1)
      )
      when 'plan_module' then coalesce(
        (select p.name || ' · ' || m.name
         from public.plan_modules pm
         join public.plans p on p.id = pm.plan_id
         join public.modules m on m.id = pm.module_id
         where pm.id::text = _entity_id
         limit 1),
        _entity_id
      )
      when 'platform_user' then coalesce(_after_json ->> 'email', _entity_id)
      else null
    end,
    _after_json ->> 'name',
    _after_json ->> 'key',
    _entity_id
  );
$$;

create or replace function public.get_operator_audit_trail(
  _limit integer default 100,
  _offset integer default 0,
  _date_from timestamptz default null,
  _date_to timestamptz default null,
  _actor_email text default null,
  _action text default null,
  _club_id uuid default null,
  _entity_type text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  is_owner boolean;
  safe_limit integer;
  safe_offset integer;
  total_count integer;
  entries jsonb;
begin
  current_platform_user := public.require_platform_permission('operator.audit.read');
  is_owner := coalesce(current_platform_user ->> 'role', '') = 'OWNER';
  safe_limit := greatest(1, least(coalesce(_limit, 100), 500));
  safe_offset := greatest(coalesce(_offset, 0), 0);

  select count(*)::integer
  into total_count
  from public.audit_logs al
  where (_date_from is null or al.created_at >= _date_from)
    and (_date_to is null or al.created_at <= _date_to)
    and (_actor_email is null or al.actor_email ilike _actor_email)
    and (_action is null or al.action = _action)
    and (_club_id is null or al.club_id = _club_id)
    and (_entity_type is null or al.entity_type = _entity_type);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', filtered.id,
        'created_at', filtered.created_at,
        'actor_user_id', filtered.actor_user_id,
        'actor_email', filtered.actor_email,
        'actor_role', filtered.actor_role,
        'action', filtered.action,
        'entity_type', filtered.entity_type,
        'entity_id', filtered.entity_id,
        'entity_name', filtered.entity_name,
        'club_id', filtered.club_id,
        'club_name', filtered.club_name,
        'reason', filtered.reason,
        'before_json', filtered.before_json,
        'after_json', filtered.after_json,
        'ip_address', case when is_owner then filtered.ip_address::text else null end,
        'user_agent', case when is_owner then filtered.user_agent else null end,
        'can_view_technical_metadata', is_owner
      )
      order by filtered.created_at desc
    ),
    '[]'::jsonb
  )
  into entries
  from (
    select
      al.id,
      al.created_at,
      al.actor_user_id,
      al.actor_email,
      al.actor_role,
      al.action,
      al.entity_type,
      al.entity_id,
      public.resolve_audit_entity_name(al.entity_type, al.entity_id, al.after_json) as entity_name,
      al.club_id,
      c.name as club_name,
      al.reason,
      al.before_json,
      al.after_json,
      al.ip_address,
      al.user_agent
    from public.audit_logs al
    left join public.clubs c on c.id = al.club_id
    where (_date_from is null or al.created_at >= _date_from)
      and (_date_to is null or al.created_at <= _date_to)
      and (_actor_email is null or al.actor_email ilike _actor_email)
      and (_action is null or al.action = _action)
      and (_club_id is null or al.club_id = _club_id)
      and (_entity_type is null or al.entity_type = _entity_type)
    order by al.created_at desc
    limit safe_limit
    offset safe_offset
  ) filtered;

  return jsonb_build_object(
    'entries', entries,
    'total', total_count,
    'limit', safe_limit,
    'offset', safe_offset,
    'can_view_technical_metadata', is_owner,
    'facets', jsonb_build_object(
      'actions', coalesce((
        select jsonb_agg(distinct action order by action)
        from public.audit_logs
      ), '[]'::jsonb),
      'entity_types', coalesce((
        select jsonb_agg(distinct entity_type order by entity_type)
        from public.audit_logs
        where entity_type is not null
      ), '[]'::jsonb),
      'actors', coalesce((
        select jsonb_agg(distinct actor_email order by actor_email)
        from public.audit_logs
        where actor_email is not null
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.resolve_audit_entity_name(text, text, jsonb) from public;
revoke all on function public.get_operator_audit_trail(integer, integer, timestamptz, timestamptz, text, text, uuid, text) from public;
grant execute on function public.get_operator_audit_trail(integer, integer, timestamptz, timestamptz, text, text, uuid, text) to authenticated;
