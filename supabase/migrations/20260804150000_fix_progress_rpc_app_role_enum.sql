-- Fix progress RPCs: app_role has admin/trainer/staff, not club_admin.\n-- Invalid enum literal club_admin caused HTTP 400 (22P02) on snapshot/challenge.\n\n-- ---------------------------------------------------------------------------
-- get_member_progress_snapshot
-- ---------------------------------------------------------------------------
create or replace function public.get_member_progress_snapshot(
  p_club_id uuid,
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stats jsonb;
  v_xp int;
  v_level text;
  v_level_idx int;
  v_next_xp int;
  v_thresholds int[] := array[0, 25, 75, 150, 300];
  v_names text[] := array['rookie', 'regular', 'core', 'leader', 'legend'];
  v_badge_count int;
  v_opt_in boolean;
  v_role text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_member_of_club(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  -- Self or staff
  if not exists (
    select 1 from public.club_memberships m
    where m.id = p_membership_id and m.club_id = p_club_id and m.user_id = v_uid
  ) and not exists (
    select 1 from public.club_memberships m
    where m.club_id = p_club_id and m.user_id = v_uid and m.status = 'active'
      and m.role::text in ('trainer', 'admin', 'staff')
  ) then
    raise exception 'not_authorized';
  end if;

  v_stats := public.award_member_achievements(p_club_id, p_membership_id);

  select count(*)::int into v_badge_count
  from public.achievements a
  where a.membership_id = p_membership_id and a.club_id = p_club_id;

  select m.public_badges_opt_in, m.role::text
  into v_opt_in, v_role
  from public.club_memberships m
  where m.id = p_membership_id;

  v_xp :=
    coalesce((v_stats->>'attended_trainings')::int, 0) * 2
    + coalesce((v_stats->>'confirmed_trainings')::int, 0) * 1
    + coalesce((v_stats->>'matches')::int, 0) * 3
    + v_badge_count * 5;

  v_level_idx := 0;
  for i in 1..array_length(v_thresholds, 1) loop
    if v_xp >= v_thresholds[i] then
      v_level_idx := i;
    end if;
  end loop;
  v_level := v_names[v_level_idx];
  if v_level_idx < array_length(v_thresholds, 1) then
    v_next_xp := v_thresholds[v_level_idx + 1];
  else
    v_next_xp := v_thresholds[v_level_idx];
  end if;

  return v_stats || jsonb_build_object(
    'xp', v_xp,
    'level', v_level,
    'level_index', v_level_idx,
    'level_xp_floor', v_thresholds[v_level_idx],
    'next_level_xp', v_next_xp,
    'badge_count', v_badge_count,
    'public_badges_opt_in', coalesce(v_opt_in, false),
    'role', coalesce(v_role, 'member')
  );
end;
$$;

revoke all on function public.get_member_progress_snapshot(uuid, uuid) from public;
grant execute on function public.get_member_progress_snapshot(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_team_attendance_challenge (anonymous-capable team rates)
-- ---------------------------------------------------------------------------
create or replace function public.get_team_attendance_challenge(
  p_club_id uuid,
  p_window_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_days int := greatest(7, least(coalesce(p_window_days, 30), 90));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_rows jsonb := '[]'::jsonb;
  v_my_team_ids uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_member_of_club(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  select exists (
    select 1 from public.club_memberships m
    where m.club_id = p_club_id and m.user_id = v_uid and m.status = 'active'
      and m.role::text in ('trainer', 'admin', 'staff')
  ) into v_is_staff;

  select coalesce(array_agg(distinct tp.team_id), '{}'::uuid[])
  into v_my_team_ids
  from public.club_memberships m
  left join public.team_players tp on tp.membership_id = m.id
  where m.club_id = p_club_id and m.user_id = v_uid and m.status = 'active';

  with team_sessions as (
    select t.id as team_id,
      t.name as team_name,
      a.id as activity_id
    from public.teams t
    join public.activities a on a.team_id = t.id
      and a.club_id = p_club_id
      and a.type = 'training'
      and a.starts_at >= v_since
      and a.starts_at < now()
    where t.club_id = p_club_id
  ),
  rates as (
    select
      ts.team_id,
      ts.team_name,
      count(distinct ts.activity_id)::int as session_count,
      case
        when count(distinct ts.activity_id) = 0 then 0::numeric
        else round(
          (
            count(*) filter (
              where aa.status in ('confirmed', 'attended')
            )::numeric
            / nullif(
              (
                select count(*)::numeric
                from public.team_players tp2
                where tp2.team_id = ts.team_id
              ) * count(distinct ts.activity_id),
              0
            )
          ) * 100,
          1
        )
      end as rate_pct
    from team_sessions ts
    left join public.activity_attendance aa
      on aa.activity_id = ts.activity_id
    group by ts.team_id, ts.team_name
  ),
  ranked as (
    select
      r.*,
      row_number() over (order by coalesce(r.rate_pct, 0) desc, r.team_name) as rank
    from rates r
    where r.session_count > 0
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'team_id', ranked.team_id,
        'team_name', case when v_is_staff then ranked.team_name else null end,
        'anonymous_label', 'Team ' || ranked.rank::text,
        'rate_pct', coalesce(ranked.rate_pct, 0),
        'session_count', ranked.session_count,
        'rank', ranked.rank,
        'is_mine', ranked.team_id = any (v_my_team_ids)
      )
      order by ranked.rank
    ),
    '[]'::jsonb
  )
  into v_rows
  from ranked;

  return jsonb_build_object(
    'window_days', v_days,
    'is_staff', v_is_staff,
    'teams', v_rows
  );
end;
$$;

revoke all on function public.get_team_attendance_challenge(uuid, int) from public;
grant execute on function public.get_team_attendance_challenge(uuid, int) to authenticated;

