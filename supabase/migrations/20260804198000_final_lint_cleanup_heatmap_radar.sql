-- Final targeted cleanup:
-- - Fix overloaded get_membership_activity_heatmap(uuid, integer)
--   to avoid missing event_participants dependency.
-- - Fix get_player_radar_stats(uuid, uuid) output-column ambiguity.

create or replace function public.get_membership_activity_heatmap(
  _club_id uuid,
  _days integer default 30
)
returns table (
  membership_id uuid,
  display_name text,
  day_bucket date,
  activity_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _start date;
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.is_member_of_club(auth.uid(), _club_id) then
    return;
  end if;

  _start := (now() - make_interval(days => greatest(7, least(coalesce(_days, 30), 365))))::date;

  return query
  with members as (
    select
      cm.id as membership_id,
      cm.user_id,
      coalesce(p.display_name, 'Member') as display_name
    from public.club_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
    where cm.club_id = _club_id
      and cm.status = 'active'
  ),
  msg as (
    select
      m.sender_id as user_id,
      date_trunc('day', m.created_at)::date as day_bucket,
      count(*)::integer as activity_count
    from public.messages m
    where m.club_id = _club_id
      and m.created_at::date >= _start
    group by m.sender_id, date_trunc('day', m.created_at)::date
  ),
  att as (
    select
      aa.membership_id,
      date_trunc('day', a.starts_at)::date as day_bucket,
      count(*)::integer as activity_count
    from public.activity_attendance aa
    join public.activities a on a.id = aa.activity_id
    where aa.club_id = _club_id
      and aa.status in ('confirmed', 'attended')
      and a.starts_at::date >= _start
    group by aa.membership_id, date_trunc('day', a.starts_at)::date
  ),
  merged as (
    select
      mem.membership_id,
      mem.display_name,
      msg.day_bucket,
      msg.activity_count
    from members mem
    join msg on msg.user_id = mem.user_id
    union all
    select
      mem.membership_id,
      mem.display_name,
      att.day_bucket,
      att.activity_count
    from members mem
    join att on att.membership_id = mem.membership_id
  )
  select
    x.membership_id,
    x.display_name,
    x.day_bucket,
    sum(x.activity_count)::integer as activity_count
  from merged x
  group by x.membership_id, x.display_name, x.day_bucket
  order by x.day_bucket asc, x.activity_count desc;
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
#variable_conflict use_column
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
      count(*) filter (where e.event_type = 'goal')::integer as ev_goals,
      count(*) filter (where e.event_type = 'assist')::integer as ev_assists,
      count(*) filter (where e.event_type = 'yellow_card')::integer as ev_yellow_cards,
      count(*) filter (where e.event_type = 'red_card')::integer as ev_red_cards
    from public.match_events e
    inner join completed_match_ids cm on cm.id = e.match_id
    where e.membership_id = _membership_id
  ),
  lu as (
    select
      count(*)::integer as lu_appearances,
      count(*) filter (where l.is_starter = true)::integer as lu_starts
    from public.match_lineups l
    inner join completed_match_ids cm on cm.id = l.match_id
    where l.membership_id = _membership_id
  ),
  att as (
    select
      count(*)::integer as att_total,
      count(*) filter (where aa.status in ('confirmed', 'attended'))::integer as att_confirmed
    from public.activity_attendance aa
    where aa.club_id = _club_id
      and aa.membership_id = _membership_id
  )
  select
    rmc.n,
    coalesce((select ev.ev_goals from ev), 0),
    coalesce((select ev.ev_assists from ev), 0),
    coalesce((select lu.lu_appearances from lu), 0),
    coalesce((select lu.lu_starts from lu), 0),
    coalesce((select att.att_total from att), 0),
    coalesce((select att.att_confirmed from att), 0),
    coalesce((select ev.ev_yellow_cards from ev), 0),
    coalesce((select ev.ev_red_cards from ev), 0)
  from radar_match_count rmc;
end;
$$;
