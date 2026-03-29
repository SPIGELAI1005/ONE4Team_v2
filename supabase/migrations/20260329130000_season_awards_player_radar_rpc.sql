-- Season awards + player radar: single-call aggregates (ST-006 residual).
--
-- Postgres does not allow CREATE OR REPLACE to change RETURNS TABLE / OUT shape; drop first if the
-- function already exists from an earlier revision (e.g. added completed_matches_count column).

drop function if exists public.get_season_award_winners(uuid);
drop function if exists public.get_player_radar_stats(uuid, uuid);

create or replace function public.get_season_award_winners(_club_id uuid)
returns table (
  completed_matches_count integer,
  golden_boot_membership_id uuid,
  golden_boot_display_name text,
  golden_boot_goals integer,
  playmaker_membership_id uuid,
  playmaker_display_name text,
  playmaker_assists integer,
  reliable_membership_id uuid,
  reliable_display_name text,
  reliable_appearances integer
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

  return query
  with completed_match_ids as (
    select m.id
    from public.matches m
    where m.club_id = _club_id
      and m.status = 'completed'
  ),
  match_count as (
    select count(*)::integer as n from completed_match_ids
  ),
  event_agg as (
    select
      e.membership_id,
      count(*) filter (where e.event_type = 'goal')::integer as goals,
      count(*) filter (where e.event_type = 'assist')::integer as assists
    from public.match_events e
    inner join completed_match_ids cm on cm.id = e.match_id
    where e.membership_id is not null
    group by e.membership_id
  ),
  lineup_agg as (
    select
      l.membership_id,
      count(*)::integer as appearances
    from public.match_lineups l
    inner join completed_match_ids cm on cm.id = l.match_id
    group by l.membership_id
  ),
  combined as (
    select
      coalesce(e.membership_id, l.membership_id) as membership_id,
      coalesce(e.goals, 0) as goals,
      coalesce(e.assists, 0) as assists,
      coalesce(l.appearances, 0) as appearances
    from event_agg e
    full outer join lineup_agg l on l.membership_id = e.membership_id
  ),
  with_names as (
    select
      c.membership_id,
      coalesce(p.display_name, 'Player') as display_name,
      c.goals,
      c.assists,
      c.appearances
    from combined c
    inner join public.club_memberships cm on cm.id = c.membership_id and cm.club_id = _club_id
    left join public.profiles p on p.user_id = cm.user_id
  ),
  gb as (
    select w.membership_id, w.display_name, w.goals
    from with_names w
    where w.goals > 0
    order by w.goals desc, w.membership_id
    limit 1
  ),
  pa as (
    select w.membership_id, w.display_name, w.assists
    from with_names w
    where w.assists > 0
    order by w.assists desc, w.membership_id
    limit 1
  ),
  mr as (
    select w.membership_id, w.display_name, w.appearances
    from with_names w
    order by w.appearances desc, w.membership_id
    limit 1
  )
  select
    mc.n,
    gb.membership_id,
    gb.display_name,
    gb.goals,
    pa.membership_id,
    pa.display_name,
    pa.assists,
    mr.membership_id,
    mr.display_name,
    mr.appearances
  from match_count mc
  cross join (select 1) as _anchor
  left join gb on true
  left join pa on true
  left join mr on true;
end;
$$;

revoke all on function public.get_season_award_winners(uuid) from public;
grant execute on function public.get_season_award_winners(uuid) to authenticated;

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
      count(*) filter (where ep.status in ('confirmed', 'attended'))::integer as attendance_confirmed
    from public.event_participants ep
    inner join public.events ev2 on ev2.id = ep.event_id
    where ep.membership_id = _membership_id
      and ev2.club_id = _club_id
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

revoke all on function public.get_player_radar_stats(uuid, uuid) from public;
grant execute on function public.get_player_radar_stats(uuid, uuid) to authenticated;
