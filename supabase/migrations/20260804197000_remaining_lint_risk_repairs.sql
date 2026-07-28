-- Consolidated follow-up repairs for remaining lint/runtime risks:
-- 1) get_membership_activity_heatmap: replace missing event_participants usage
--    with activity_attendance + activities.
-- 2) get_player_radar_stats: replace missing event_participants usage
--    with activity_attendance.
-- 3) get_operator_support_club_diagnostics: avoid unsafe plans join type mismatch.
-- 4) get_operator_support_user_diagnostics: remove auth_user_id ambiguity.

create or replace function public.get_membership_activity_heatmap(
  _club_id uuid,
  _membership_id uuid default null,
  _days integer default 140
)
returns table (
  day date,
  activity_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _effective_days integer;
  _resolved_membership_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.is_member_of_club(auth.uid(), _club_id) then
    return;
  end if;

  _effective_days := greatest(7, least(coalesce(_days, 140), 365));

  if _membership_id is not null then
    select cm.id
      into _resolved_membership_id
    from public.club_memberships cm
    where cm.id = _membership_id
      and cm.club_id = _club_id
    limit 1;
  else
    select cm.id
      into _resolved_membership_id
    from public.club_memberships cm
    where cm.club_id = _club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
    order by cm.created_at desc
    limit 1;
  end if;

  if _resolved_membership_id is null then
    return;
  end if;

  return query
  with attendance_activity as (
    select
      (a.starts_at at time zone 'UTC')::date as day,
      count(*)::integer as cnt
    from public.activity_attendance aa
    inner join public.activities a on a.id = aa.activity_id
    where aa.club_id = _club_id
      and aa.membership_id = _resolved_membership_id
      and aa.status in ('confirmed', 'attended')
      and a.starts_at >= (now() - make_interval(days => _effective_days))
    group by (a.starts_at at time zone 'UTC')::date
  ),
  match_appearances as (
    select
      (m.match_date at time zone 'UTC')::date as day,
      count(*)::integer as cnt
    from public.match_lineups ml
    inner join public.matches m on m.id = ml.match_id
    where ml.membership_id = _resolved_membership_id
      and m.match_date >= (now() - make_interval(days => _effective_days))
    group by (m.match_date at time zone 'UTC')::date
  ),
  unioned as (
    select * from attendance_activity
    union all
    select * from match_appearances
  )
  select
    u.day,
    sum(u.cnt)::integer as activity_count
  from unioned u
  group by u.day
  order by u.day asc;
end;
$$;


create or replace function public.get_player_radar_stats(_club_id uuid, _membership_id uuid)
returns table (
  completed_matches_count integer,
  goals integer,
  assists integer,
  appearances integer,
  starts integer,
  attendance_total integer,
  attendance_confirmed integer,
  yellow_cards integer,
  red_cards integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.is_member_of_club(auth.uid(), _club_id) then
    return;
  end if;

  if not exists (
    select 1 from public.club_memberships cm
    where cm.id = _membership_id and cm.club_id = _club_id
  ) then
    return;
  end if;

  return query
  with completed_match_ids as (
    select m.id
    from public.matches m
    where m.club_id = _club_id
      and m.status = 'completed'
  ),
  radar_match_count as (
    select count(*)::integer as n from completed_match_ids
  ),
  ev as (
    select
      count(*) filter (where e.event_type = 'goal')::integer as goals,
      count(*) filter (where e.event_type = 'assist')::integer as assists,
      count(*) filter (where e.event_type = 'yellow_card')::integer as yellow_cards,
      count(*) filter (where e.event_type = 'red_card')::integer as red_cards
    from public.match_events e
    inner join completed_match_ids cm on cm.id = e.match_id
    where e.membership_id = _membership_id
  ),
  lu as (
    select
      count(*)::integer as appearances,
      count(*) filter (where l.is_starter = true)::integer as starts
    from public.match_lineups l
    inner join completed_match_ids cm on cm.id = l.match_id
    where l.membership_id = _membership_id
  ),
  att as (
    select
      count(*)::integer as attendance_total,
      count(*) filter (where aa.status in ('confirmed', 'attended'))::integer as attendance_confirmed
    from public.activity_attendance aa
    where aa.club_id = _club_id
      and aa.membership_id = _membership_id
  )
  select
    rmc.n,
    coalesce((select goals from ev), 0),
    coalesce((select assists from ev), 0),
    coalesce((select appearances from lu), 0),
    coalesce((select starts from lu), 0),
    coalesce((select attendance_total from att), 0),
    coalesce((select attendance_confirmed from att), 0),
    coalesce((select yellow_cards from ev), 0),
    coalesce((select red_cards from ev), 0)
  from radar_match_count rmc;
end;
$$;


create or replace function public.get_operator_support_club_diagnostics(_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  club_row public.clubs%rowtype;
  plan_name text;
  enabled_modules integer;
  member_count integer;
  failed_invites_7d integer;
  open_issues integer;
begin
  perform public.require_platform_permission('operator.support.use');

  select * into club_row
  from public.clubs c
  where c.id = _club_id;

  if not found then
    raise exception 'Club not found' using errcode = 'P0002';
  end if;

  -- Keep this robust across environments where plans.id typing differs.
  select bs.plan_id into plan_name
  from public.billing_subscriptions bs
  where bs.club_id = _club_id
  order by bs.updated_at desc nulls last
  limit 1;

  select count(*)::integer into enabled_modules
  from public.club_module_entitlements cme
  where cme.club_id = _club_id
    and cme.enabled = true
    and (cme.valid_until is null or cme.valid_until > now());

  select count(*)::integer into member_count
  from public.club_memberships cm
  where cm.club_id = _club_id;

  select count(*)::integer into failed_invites_7d
  from public.club_invites ci
  where ci.club_id = _club_id
    and ci.used_at is null
    and ci.expires_at is not null
    and ci.expires_at < now()
    and ci.created_at >= now() - interval '7 days';

  select count(*)::integer into open_issues
  from public.abuse_alerts aa
  where aa.club_id = _club_id
    and aa.status = 'open';

  return jsonb_build_object(
    'club', jsonb_build_object(
      'id', club_row.id,
      'name', club_row.name,
      'slug', club_row.slug,
      'status', club_row.status,
      'created_at', club_row.created_at,
      'updated_at', club_row.updated_at
    ),
    'plan_name', plan_name,
    'enabled_modules', enabled_modules,
    'member_count', member_count,
    'failed_invites_7d', failed_invites_7d,
    'open_issues', open_issues,
    'public_club_url', '/club/' || club_row.slug
  );
end;
$$;


create or replace function public.get_operator_support_user_diagnostics(_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text;
  v_auth_user_id uuid;
  profile_row public.profiles%rowtype;
  platform_role text;
  platform_status text;
begin
  perform public.require_platform_permission('operator.support.use');

  normalized_email := lower(trim(_email));
  if normalized_email is null or length(normalized_email) = 0 then
    raise exception 'Email is required.' using errcode = '22023';
  end if;

  select u.id into v_auth_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if v_auth_user_id is null then
    return jsonb_build_object(
      'found', false,
      'email', normalized_email
    );
  end if;

  select * into profile_row
  from public.profiles p
  where p.user_id = v_auth_user_id;

  select pu.role, pu.status
  into platform_role, platform_status
  from public.platform_users pu
  where pu.auth_user_id = v_auth_user_id;

  return jsonb_build_object(
    'found', true,
    'email', normalized_email,
    'user_id', v_auth_user_id,
    'display_name', coalesce(nullif(trim(profile_row.display_name), ''), normalized_email),
    'profile_updated_at', profile_row.updated_at,
    'platform_role', platform_role,
    'platform_status', platform_status,
    'clubs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'club_id', cm.club_id,
          'club_name', c.name,
          'club_slug', c.slug,
          'role', cm.role,
          'status', cm.status,
          'joined_at', cm.created_at
        )
        order by cm.created_at desc
      )
      from public.club_memberships cm
      join public.clubs c on c.id = cm.club_id
      where cm.user_id = v_auth_user_id
    ), '[]'::jsonb),
    'recent_invites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'club_id', ci.club_id,
          'club_name', c.name,
          'role', ci.role,
          'created_at', ci.created_at,
          'expires_at', ci.expires_at,
          'used_at', ci.used_at,
          'status', case
            when ci.used_at is not null then 'used'
            when ci.expires_at is not null and ci.expires_at < now() then 'expired'
            else 'pending'
          end
        )
        order by ci.created_at desc
      )
      from (
        select *
        from public.club_invites ci
        where lower(coalesce(ci.email, '')) = normalized_email
        order by ci.created_at desc
        limit 10
      ) ci
      join public.clubs c on c.id = ci.club_id
    ), '[]'::jsonb)
  );
end;
$$;
