-- Batch analytics RPCs to reduce client fan-out on heavy charts.

create or replace function public.get_team_chemistry_pairs(
  _club_id uuid,
  _max_matches integer default 300,
  _min_together integer default 2,
  _limit integer default 5
)
returns table (
  membership_id_1 uuid,
  membership_id_2 uuid,
  wins integer,
  total integer,
  win_rate integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _effective_match_limit integer;
  _effective_min_together integer;
  _effective_limit integer;
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.is_member_of_club(_club_id, auth.uid()) then
    return;
  end if;

  _effective_match_limit := greatest(1, least(coalesce(_max_matches, 300), 500));
  _effective_min_together := greatest(1, least(coalesce(_min_together, 2), 20));
  _effective_limit := greatest(1, least(coalesce(_limit, 5), 30));

  return query
  with recent_matches as (
    select
      m.id,
      (
        case
          when m.is_home then coalesce(m.home_score, 0) > coalesce(m.away_score, 0)
          else coalesce(m.away_score, 0) > coalesce(m.home_score, 0)
        end
      ) as won
    from public.matches m
    where m.club_id = _club_id
      and m.status = 'completed'
    order by m.match_date desc
    limit _effective_match_limit
  ),
  starters as (
    select l.match_id, l.membership_id
    from public.match_lineups l
    inner join recent_matches rm on rm.id = l.match_id
    where l.is_starter = true
  ),
  pairs as (
    select
      s1.membership_id as membership_id_1,
      s2.membership_id as membership_id_2,
      count(*)::integer as total,
      count(*) filter (where rm.won)::integer as wins
    from starters s1
    inner join starters s2
      on s1.match_id = s2.match_id
     and s1.membership_id < s2.membership_id
    inner join recent_matches rm on rm.id = s1.match_id
    group by s1.membership_id, s2.membership_id
    having count(*) >= _effective_min_together
  )
  select
    p.membership_id_1,
    p.membership_id_2,
    p.wins,
    p.total,
    case when p.total > 0 then round((p.wins::numeric / p.total::numeric) * 100)::integer else 0 end as win_rate
  from pairs p
  order by
    case when p.total > 0 then (p.wins::numeric / p.total::numeric) else 0 end desc,
    p.total desc
  limit _effective_limit;
end;
$$;

revoke all on function public.get_team_chemistry_pairs(uuid, integer, integer, integer) from public;
grant execute on function public.get_team_chemistry_pairs(uuid, integer, integer, integer) to authenticated;

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

  if not public.is_member_of_club(_club_id, auth.uid()) then
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
  with events_attendance as (
    select
      (e.starts_at at time zone 'UTC')::date as day,
      count(*)::integer as cnt
    from public.event_participants ep
    inner join public.events e on e.id = ep.event_id
    where ep.membership_id = _resolved_membership_id
      and ep.status in ('confirmed', 'attended')
      and e.starts_at >= (now() - make_interval(days => _effective_days))
    group by (e.starts_at at time zone 'UTC')::date
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
    select * from events_attendance
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

revoke all on function public.get_membership_activity_heatmap(uuid, uuid, integer) from public;
grant execute on function public.get_membership_activity_heatmap(uuid, uuid, integer) to authenticated;
