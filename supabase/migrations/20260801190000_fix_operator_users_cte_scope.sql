-- Fix: get_operator_users referenced the CTE `filtered` from a second, separate
-- statement, where it is out of scope (relation "filtered" does not exist).
-- Recompute entries and total within a single statement sharing the CTE chain.

create or replace function public.get_operator_users(
  _search text default null,
  _club_id uuid default null,
  _club_role text default null,
  _status text default null,
  _platform_role text default null,
  _last_active_from timestamptz default null,
  _last_active_to timestamptz default null,
  _limit integer default 50,
  _offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  current_platform_user jsonb;
  detail_level text;
  safe_limit integer;
  safe_offset integer;
  result jsonb;
begin
  current_platform_user := public.require_platform_permission('operator.users.read');
  detail_level := case coalesce(current_platform_user ->> 'role', '')
    when 'OWNER' then 'full'
    when 'OPERATOR' then 'full'
    when 'SUPPORT' then 'support'
    else 'summary'
  end;
  safe_limit := greatest(1, least(coalesce(_limit, 50), 200));
  safe_offset := greatest(coalesce(_offset, 0), 0);

  with user_accounts as (
    select
      u.id as user_id,
      coalesce(
        nullif(trim(p.display_name), ''),
        nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
        split_part(u.email, '@', 1)
      ) as display_name,
      u.email as email_raw,
      public.mask_operator_email(u.email, detail_level) as email,
      coalesce(p.created_at, u.created_at) as created_at,
      p.updated_at as profile_updated_at,
      pu.role as platform_role,
      pu.status as platform_status
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.platform_users pu on pu.auth_user_id = u.id
    where exists (
      select 1
      from public.club_memberships cm
      where cm.user_id = u.id
    )
    or pu.auth_user_id is not null
    or p.user_id is not null
  ),
  membership_summary as (
    select
      cm.user_id,
      jsonb_agg(
        jsonb_build_object(
          'club_id', c.id,
          'club_name', c.name,
          'club_slug', c.slug,
          'role', cm.role::text,
          'status', cm.status,
          'membership_id', cm.id
        )
        order by c.name
      ) as clubs,
      string_agg(distinct cm.role::text, ', ' order by cm.role::text) as club_roles,
      string_agg(distinct c.name, ', ' order by c.name) as club_names,
      max(cm.updated_at) as last_membership_activity,
      bool_or(cm.status = 'active') as has_active_membership
    from public.club_memberships cm
    join public.clubs c on c.id = cm.club_id
    group by cm.user_id
  ),
  usage_activity as (
    select
      ue.user_id,
      max(ue.created_at) as last_usage_at
    from public.usage_events ue
    where ue.user_id is not null
    group by ue.user_id
  ),
  invite_status as (
    select
      ua.user_id,
      case
        when exists (
          select 1
          from public.club_invites ci
          where lower(coalesce(ci.email, '')) = lower(coalesce(ua.email_raw, ''))
            and ci.used_at is null
            and (ci.expires_at is null or ci.expires_at > now())
        ) then 'pending'
        when exists (
          select 1
          from public.club_memberships cm
          where cm.user_id = ua.user_id
        ) then 'accepted'
        when exists (
          select 1
          from public.club_invites ci
          where lower(coalesce(ci.email, '')) = lower(coalesce(ua.email_raw, ''))
        ) then 'expired'
        else 'none'
      end as invitation_status
    from user_accounts ua
  ),
  enriched as (
    select
      ua.user_id,
      ua.display_name,
      ua.email,
      ua.created_at,
      ua.platform_role,
      ua.platform_status,
      coalesce(ms.clubs, '[]'::jsonb) as clubs,
      coalesce(ms.club_roles, '') as club_roles,
      coalesce(ms.club_names, '') as club_names,
      coalesce(isv.invitation_status, 'none') as invitation_status,
      greatest(
        coalesce(ua.profile_updated_at, ua.created_at),
        coalesce(ms.last_membership_activity, ua.created_at),
        coalesce(ua_usage.last_usage_at, ua.created_at)
      ) as last_active_at,
      case
        when ua.platform_role is not null and ms.user_id is null then 'platform_only'
        when coalesce(ms.has_active_membership, false) then 'active'
        when ms.user_id is not null then 'inactive'
        else 'unassigned'
      end as account_status
    from user_accounts ua
    left join membership_summary ms on ms.user_id = ua.user_id
    left join usage_activity ua_usage on ua_usage.user_id = ua.user_id
    left join invite_status isv on isv.user_id = ua.user_id
  ),
  filtered as (
    select *
    from enriched e
    where (_search is null or trim(_search) = '' or e.display_name ilike '%' || trim(_search) || '%' or e.email ilike '%' || trim(_search) || '%')
      and (
        _club_id is null
        or exists (
          select 1
          from jsonb_array_elements(e.clubs) club_row
          where (club_row ->> 'club_id')::uuid = _club_id
        )
      )
      and (
        _club_role is null
        or trim(_club_role) = ''
        or exists (
          select 1
          from jsonb_array_elements(e.clubs) club_row
          where club_row ->> 'role' = trim(_club_role)
        )
      )
      and (_status is null or trim(_status) = '' or e.account_status = trim(_status))
      and (
        _platform_role is null
        or trim(_platform_role) = ''
        or (_platform_role = 'none' and e.platform_role is null)
        or e.platform_role = trim(_platform_role)
      )
      and (_last_active_from is null or e.last_active_at >= _last_active_from)
      and (_last_active_to is null or e.last_active_at <= _last_active_to)
  )
  select jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', f.user_id,
          'display_name', f.display_name,
          'email', f.email,
          'clubs', f.clubs,
          'club_names', f.club_names,
          'club_roles', f.club_roles,
          'platform_role', f.platform_role,
          'platform_status', f.platform_status,
          'status', f.account_status,
          'created_at', f.created_at,
          'last_active_at', f.last_active_at,
          'invitation_status', f.invitation_status
        )
        order by f.last_active_at desc nulls last, f.display_name
      )
      from (
        select *
        from filtered
        order by last_active_at desc nulls last, display_name
        limit safe_limit
        offset safe_offset
      ) f
    ), '[]'::jsonb),
    'total', (select count(*)::integer from filtered),
    'limit', safe_limit,
    'offset', safe_offset,
    'detail_level', detail_level,
    'facets', jsonb_build_object(
      'statuses', jsonb_build_array('active', 'inactive', 'unassigned', 'platform_only'),
      'platform_roles', jsonb_build_array('OWNER', 'OPERATOR', 'SUPPORT', 'VIEWER', 'none'),
      'club_roles', coalesce((
        select jsonb_agg(distinct role_value order by role_value)
        from (
          select distinct cm.role::text as role_value
          from public.club_memberships cm
        ) roles
      ), '[]'::jsonb)
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_operator_users(text, uuid, text, text, text, timestamptz, timestamptz, integer, integer) from public;
grant execute on function public.get_operator_users(text, uuid, text, text, text, timestamptz, timestamptz, integer, integer) to authenticated;
