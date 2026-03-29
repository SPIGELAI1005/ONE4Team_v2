-- RPC for player stats leaderboard aggregation with filter support.

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

  if not public.is_member_of_club(_club_id, auth.uid()) then
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

revoke all on function public.get_player_stats_aggregate(uuid, uuid, uuid, uuid[]) from public;
grant execute on function public.get_player_stats_aggregate(uuid, uuid, uuid, uuid[]) to authenticated;
