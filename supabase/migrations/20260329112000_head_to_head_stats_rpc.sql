-- Aggregate head-to-head stats via a single RPC to avoid client fan-out/N+1 style analytics reads.

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

  if not public.is_member_of_club(_club_id, auth.uid()) then
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

revoke all on function public.get_head_to_head_stats(uuid, uuid[], integer) from public;
grant execute on function public.get_head_to_head_stats(uuid, uuid[], integer) to authenticated;
