-- Fix reversed is_member_of_club arguments (must be _user_id, _club_id).

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

  if not public.is_member_of_club(auth.uid(), _club_id) then
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

create or replace function public.get_head_to_head_stats(
  _club_id uuid,
  _membership_ids uuid[],
  _max_matches integer default 300
)
returns table (
  membership_id uuid,
  goals integer,
  assists integer,
  appearances integer,
  cards integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _effective_limit integer;
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.is_member_of_club(auth.uid(), _club_id) then
    return;
  end if;

  _effective_limit := greatest(1, least(coalesce(_max_matches, 300), 500));

  return query
  with selected_memberships as (
    select m.id
    from public.club_memberships m
    where m.club_id = _club_id
      and m.id = any(_membership_ids)
  ),
  recent_matches as (
    select mt.id
    from public.matches mt
    where mt.club_id = _club_id
      and mt.status = 'completed'
    order by mt.match_date desc
    limit _effective_limit
  ),
  lineup_agg as (
    select
      l.membership_id,
      count(*)::integer as appearances
    from public.match_lineups l
    inner join recent_matches rm on rm.id = l.match_id
    group by l.membership_id
  ),
  event_agg as (
    select
      e.membership_id,
      count(*) filter (where e.event_type = 'goal')::integer as goals,
      count(*) filter (where e.event_type = 'assist')::integer as assists,
      count(*) filter (where e.event_type in ('yellow_card', 'red_card'))::integer as cards
    from public.match_events e
    inner join recent_matches rm on rm.id = e.match_id
    where e.membership_id is not null
    group by e.membership_id
  )
  select
    sm.id as membership_id,
    coalesce(ea.goals, 0) as goals,
    coalesce(ea.assists, 0) as assists,
    coalesce(la.appearances, 0) as appearances,
    coalesce(ea.cards, 0) as cards
  from selected_memberships sm
  left join lineup_agg la on la.membership_id = sm.id
  left join event_agg ea on ea.membership_id = sm.id;
end;
$$;

create or replace function public.get_player_stats_aggregate(
  _club_id uuid,
  _team_id uuid default null,
  _competition_id uuid default null,
  _competition_ids uuid[] default null
)
returns table (
  membership_id uuid,
  display_name text,
  goals integer,
  assists integer,
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

  return query
  with filtered_matches as (
    select m.id
    from public.matches m
    where m.club_id = _club_id
      and (_team_id is null or m.team_id = _team_id)
      and (
        (_competition_id is not null and m.competition_id = _competition_id)
        or
        (_competition_id is null and (coalesce(array_length(_competition_ids, 1), 0) = 0 or m.competition_id = any(_competition_ids)))
      )
  ),
  agg as (
    select
      e.membership_id,
      count(*) filter (where e.event_type = 'goal')::integer as goals,
      count(*) filter (where e.event_type = 'assist')::integer as assists,
      count(*) filter (where e.event_type = 'yellow_card')::integer as yellow_cards,
      count(*) filter (where e.event_type = 'red_card')::integer as red_cards
    from public.match_events e
    inner join filtered_matches fm on fm.id = e.match_id
    where e.membership_id is not null
      and e.event_type in ('goal', 'assist', 'yellow_card', 'red_card')
    group by e.membership_id
  )
  select
    cm.id as membership_id,
    coalesce(p.display_name, 'Unknown') as display_name,
    coalesce(a.goals, 0) as goals,
    coalesce(a.assists, 0) as assists,
    coalesce(a.yellow_cards, 0) as yellow_cards,
    coalesce(a.red_cards, 0) as red_cards
  from agg a
  inner join public.club_memberships cm on cm.id = a.membership_id
  left join public.profiles p on p.user_id = cm.user_id
  where cm.club_id = _club_id
  order by
    a.goals desc,
    a.assists desc,
    a.yellow_cards desc,
    a.red_cards desc;
end;
$$;
