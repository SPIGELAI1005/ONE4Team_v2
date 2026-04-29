-- Public club website: allow anonymous reads of training-related rows for is_public clubs,
-- and a security-definer RPC for team roster + schedule (profiles stay non-public to anon).
--
-- training_sessions: optional — some deployments never created this table; public SELECT policy is skipped then.
-- Team-page RPC lists trainings from activities only (same as schedule-first model).

drop policy if exists "Public can view activities of public clubs" on public.activities;
create policy "Public can view activities of public clubs"
on public.activities
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.clubs c
    where c.id = activities.club_id
      and c.is_public = true
  )
);

do $policy$
begin
  if to_regclass('public.training_sessions') is not null then
    execute $sql$
      drop policy if exists "Public can view training_sessions of public clubs" on public.training_sessions;
      create policy "Public can view training_sessions of public clubs"
      on public.training_sessions
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.clubs c
          where c.id = training_sessions.club_id
            and c.is_public = true
        )
      );
    $sql$;
  end if;
end
$policy$;

create or replace function public.get_public_club_team_page(_club_slug text, _team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_is_public boolean;
  v_team record;
  v_coaches jsonb;
  v_players jsonb;
  v_trainings jsonb;
  v_matches jsonb;
begin
  select c.id, c.is_public
  into v_club_id, v_is_public
  from public.clubs c
  where c.slug = _club_slug
  limit 1;

  if v_club_id is null then
    return null::jsonb;
  end if;

  if coalesce(v_is_public, false) is not true then
    if auth.uid() is null or not public.is_member_of_club(auth.uid(), v_club_id) then
      return null::jsonb;
    end if;
  end if;

  select t.*
  into v_team
  from public.teams t
  where t.id = _team_id
    and t.club_id = v_club_id
  limit 1;

  if v_team.id is null then
    return null::jsonb;
  end if;

  with coach_names as (
    select nullif(trim(both from v_team.coach_name), '') as nm
    where v_team.coach_name is not null
    union
    select nullif(trim(both from p.display_name), '') as nm
    from public.team_coaches tc
    inner join public.club_memberships cm
      on cm.id = tc.membership_id
     and cm.club_id = v_club_id
     and cm.status = 'active'
    inner join public.profiles p on p.user_id = cm.user_id
    where tc.team_id = _team_id
    union
    select nullif(trim(both from cpp.display_name), '') as nm
    from public.team_coaches tc
    inner join public.club_person_placeholders cpp
      on cpp.id = tc.placeholder_id
     and cpp.club_id = v_club_id
    where tc.team_id = _team_id
  ),
  coach_distinct as (select distinct nm from coach_names where nm is not null)
  select coalesce(
    jsonb_agg(jsonb_build_object('name', d.nm) order by d.nm),
    '[]'::jsonb
  )
  into v_coaches
  from coach_distinct d;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'display_name', nullif(trim(both from p.display_name), ''),
        'jersey_number', tp.jersey_number
      )
      order by tp.jersey_number nulls last, p.display_name
    ),
    '[]'::jsonb
  )
  into v_players
  from public.team_players tp
  inner join public.club_memberships cm
    on cm.id = tp.membership_id
   and cm.club_id = v_club_id
   and cm.status = 'active'
   and cm.role = 'player'
  inner join public.profiles p on p.user_id = cm.user_id
  where tp.team_id = _team_id;

  -- Trainings from activities only (training_sessions is not present in all deployments).
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'source', 'activity'::text,
          'id', x.id::text,
          'title', x.title,
          'starts_at', x.starts_at,
          'ends_at', x.ends_at,
          'location', x.location
        )
        order by x.starts_at asc
      )
      from (
        select a.id, a.title, a.starts_at, a.ends_at, a.location
        from public.activities a
        where a.club_id = v_club_id
          and a.team_id = _team_id
          and a.type = 'training'
          and a.starts_at >= (now() - interval '1 day')
        order by a.starts_at asc
        limit 50
      ) x
    ),
    '[]'::jsonb
  )
  into v_trainings;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'opponent', m.opponent,
          'is_home', m.is_home,
          'match_date', m.match_date,
          'location', m.location,
          'status', m.status,
          'home_score', m.home_score,
          'away_score', m.away_score
        )
        order by m.match_date desc nulls last
      )
      from (
        select mm.id, mm.opponent, mm.is_home, mm.match_date, mm.location, mm.status, mm.home_score, mm.away_score
        from public.matches mm
        where mm.club_id = v_club_id
          and mm.team_id = _team_id
        order by mm.match_date desc nulls last
        limit 25
      ) m
    ),
    '[]'::jsonb
  )
  into v_matches;

  return jsonb_build_object(
    'team',
    jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'sport', v_team.sport,
      'age_group', v_team.age_group,
      'league', v_team.league,
      'coach_name', v_team.coach_name
    ),
    'coaches', v_coaches,
    'players', v_players,
    'trainings', v_trainings,
    'matches', v_matches
  );
end;
$$;

revoke all on function public.get_public_club_team_page(text, uuid) from public;
grant execute on function public.get_public_club_team_page(text, uuid) to anon, authenticated;
