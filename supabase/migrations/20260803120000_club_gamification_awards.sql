-- Club gamification: RLS-safe awards, progress snapshot, team attendance challenge, adult badge opt-in.

alter table public.club_memberships
  add column if not exists public_badges_opt_in boolean not null default false;

comment on column public.club_memberships.public_badges_opt_in is
  'When true, adult members may show badge icons on public club surfaces if privacy flags allow.';

-- Ensure achievements exists (baseline migration may be absent on some remotes).
create table if not exists public.achievements (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  badge_type text not null,
  badge_name text not null,
  badge_icon text not null default '🏅',
  earned_at timestamptz not null default now(),
  unique (membership_id, badge_type)
);

create index if not exists idx_achievements_membership on public.achievements(membership_id);
create index if not exists idx_achievements_club on public.achievements(club_id);

alter table public.achievements enable row level security;

-- Achievements: members may SELECT; inserts only via security-definer RPCs (not client INSERT).
drop policy if exists "Admins can manage achievements" on public.achievements;
drop policy if exists "Members can view achievements in their club" on public.achievements;

create policy "Members can view achievements in their club"
  on public.achievements for select
  to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

create policy "Admins can update delete achievements"
  on public.achievements for update
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

create policy "Admins can delete achievements"
  on public.achievements for delete
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- award_member_achievements
-- ---------------------------------------------------------------------------
create or replace function public.award_member_achievements(
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
  v_member uuid;
  v_goals int := 0;
  v_assists int := 0;
  v_matches int := 0;
  v_attended int := 0;
  v_confirmed int := 0;
  v_streak int := 0;
  v_best_streak int := 0;
  v_cur int := 0;
  v_status text;
  v_current_locked boolean := false;
  r record;
  v_awarded jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_member_of_club(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  select m.id into v_member
  from public.club_memberships m
  where m.id = p_membership_id
    and m.club_id = p_club_id
    and m.status = 'active';
  if v_member is null then
    raise exception 'membership_not_found';
  end if;

  -- Caller may award self; trainers/admins may award any club member.
  if not exists (
    select 1 from public.club_memberships m
    where m.id = p_membership_id and m.user_id = v_uid
  )
    and not public.is_club_admin(v_uid, p_club_id)
    and not public.is_club_trainer(v_uid, p_club_id)
  then
    raise exception 'not_authorized';
  end if;

  select
    count(*) filter (where me.event_type = 'goal'),
    count(*) filter (where me.event_type = 'assist')
  into v_goals, v_assists
  from public.match_events me
  join public.matches m on m.id = me.match_id
  where me.membership_id = p_membership_id
    and m.club_id = p_club_id;

  select count(*) into v_matches
  from public.match_lineups ml
  join public.matches m on m.id = ml.match_id
  where ml.membership_id = p_membership_id
    and m.club_id = p_club_id;

  select
    count(*) filter (where aa.status = 'attended'),
    count(*) filter (where aa.status in ('confirmed', 'attended'))
  into v_attended, v_confirmed
  from public.activity_attendance aa
  join public.activities a on a.id = aa.activity_id
  where aa.membership_id = p_membership_id
    and aa.club_id = p_club_id
    and a.type = 'training'
    and a.starts_at < now();

  -- Current + best streak over past trainings linked to the member's teams.
  v_streak := 0;
  v_best_streak := 0;
  v_cur := 0;
  v_current_locked := false;
  for r in
    select a.id,
      coalesce(
        (
          select aa.status
          from public.activity_attendance aa
          where aa.activity_id = a.id
            and aa.membership_id = p_membership_id
          limit 1
        ),
        'missing'
      ) as att_status
    from public.activities a
    where a.club_id = p_club_id
      and a.type = 'training'
      and a.starts_at < now()
      and (
        a.team_id is null
        or exists (
          select 1 from public.team_players tp
          where tp.team_id = a.team_id
            and tp.membership_id = p_membership_id
        )
        or exists (
          select 1 from public.team_coaches tc
          where tc.team_id = a.team_id
            and tc.membership_id = p_membership_id
        )
      )
    order by a.starts_at desc
    limit 80
  loop
    v_status := r.att_status;
    if v_status in ('attended', 'confirmed') then
      v_cur := v_cur + 1;
      if v_cur > v_best_streak then
        v_best_streak := v_cur;
      end if;
    else
      if not v_current_locked then
        v_streak := v_cur;
        v_current_locked := true;
      end if;
      v_cur := 0;
    end if;
  end loop;
  if not v_current_locked then
    v_streak := v_cur;
  end if;
  if v_best_streak < v_streak then
    v_best_streak := v_streak;
  end if;

  -- Match / scoring badges
  if v_goals >= 5 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'goals_5', 'Sharp Shooter', 'goals_5')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_goals >= 10 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'goals_10', 'Goal Machine', 'goals_10')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_goals >= 25 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'goals_25', 'Legend Striker', 'goals_25')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_assists >= 5 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'assists_5', 'Playmaker', 'assists_5')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_assists >= 10 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'assists_10', 'Vision Master', 'assists_10')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_matches >= 10 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'matches_10', 'Squad Regular', 'matches_10')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_matches >= 25 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'matches_25', 'Veteran', 'matches_25')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_matches >= 50 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'matches_50', 'Club Legend', 'matches_50')
    on conflict (membership_id, badge_type) do nothing;
  end if;

  -- Attendance streak badges (use best streak)
  if v_best_streak >= 5 or v_streak >= 5 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'attendance_streak_5', 'Training Streak 5', 'attendance_streak_5')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_best_streak >= 10 or v_streak >= 10 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'attendance_streak_10', 'Training Streak 10', 'attendance_streak_10')
    on conflict (membership_id, badge_type) do nothing;
  end if;
  if v_best_streak >= 25 or v_streak >= 25 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'attendance_streak_25', 'Training Streak 25', 'attendance_streak_25')
    on conflict (membership_id, badge_type) do nothing;
  end if;

  -- RSVP reliability (confirmed/attended count)
  if v_confirmed >= 5 then
    insert into public.achievements (club_id, membership_id, badge_type, badge_name, badge_icon)
    values (p_club_id, p_membership_id, 'rsvp_on_time_5', 'Reliable RSVP', 'rsvp_on_time_5')
    on conflict (membership_id, badge_type) do nothing;
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.earned_at desc), '[]'::jsonb)
  into v_awarded
  from public.achievements a
  where a.membership_id = p_membership_id
    and a.club_id = p_club_id;

  return jsonb_build_object(
    'membership_id', p_membership_id,
    'goals', v_goals,
    'assists', v_assists,
    'matches', v_matches,
    'attended_trainings', v_attended,
    'confirmed_trainings', v_confirmed,
    'attendance_streak', v_streak,
    'attendance_best_streak', v_best_streak,
    'badges', v_awarded
  );
end;
$$;

revoke all on function public.award_member_achievements(uuid, uuid) from public;
grant execute on function public.award_member_achievements(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
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
      and m.role in ('trainer', 'club_admin', 'admin')
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
      and m.role in ('trainer', 'club_admin', 'admin')
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

-- Opt-in updater for own membership
create or replace function public.set_public_badges_opt_in(
  p_club_id uuid,
  p_opt_in boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select m.role::text into v_role
  from public.club_memberships m
  where m.club_id = p_club_id
    and m.user_id = v_uid
    and m.status = 'active'
  limit 1;

  if v_role is null then
    raise exception 'not_authorized';
  end if;

  -- Youth-sensitive: players cannot opt into public badges
  if v_role = 'player' and p_opt_in is true then
    raise exception 'players_cannot_opt_in_public_badges';
  end if;

  update public.club_memberships
  set public_badges_opt_in = coalesce(p_opt_in, false),
      updated_at = now()
  where club_id = p_club_id
    and user_id = v_uid
    and status = 'active';

  return coalesce(p_opt_in, false);
end;
$$;

revoke all on function public.set_public_badges_opt_in(uuid, boolean) from public;
grant execute on function public.set_public_badges_opt_in(uuid, boolean) to authenticated;

-- Public strip: opted-in adult badges for a club (app still gates on privacy flags).
create or replace function public.list_public_opt_in_badges(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'membership_id', x.id,
        'display_name', x.display_name,
        'badges', x.badges
      )
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      m.id,
      coalesce(nullif(trim(p.display_name), ''), 'Member') as display_name,
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'badge_type', a.badge_type,
              'badge_name', a.badge_name
            )
            order by a.earned_at desc
          ),
          '[]'::jsonb
        )
        from (
          select a2.badge_type, a2.badge_name, a2.earned_at
          from public.achievements a2
          where a2.membership_id = m.id
          order by a2.earned_at desc
          limit 6
        ) a
      ) as badges
    from public.club_memberships m
    left join public.profiles p on p.user_id = m.user_id
    where m.club_id = p_club_id
      and m.status = 'active'
      and m.public_badges_opt_in = true
      and m.role::text <> 'player'
    order by m.created_at desc
    limit 24
  ) x;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.list_public_opt_in_badges(uuid) from public;
grant execute on function public.list_public_opt_in_badges(uuid) to anon, authenticated;
