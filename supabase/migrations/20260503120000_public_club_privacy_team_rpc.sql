-- Public team page RPC: respect club public_page_published_config visibilityRules + youth flags.

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
  v_cfg jsonb;
  vr jsonb;
  v_hide_coach_names boolean := false;
  v_hide_coach_contact boolean := false;
  v_hide_training_loc boolean := false;
  v_hide_match_scores boolean := false;
  v_hide_player_stats boolean := false;
  v_youth boolean := false;
  v_youth_hide_images boolean := false;
  v_youth_allow_phone boolean := false;
  v_coaches jsonb;
  v_players jsonb := '[]'::jsonb;
  v_trainings jsonb;
  v_matches jsonb;
  v_next_match jsonb;
  v_news jsonb;
  v_documents jsonb;
  v_stats jsonb;
  v_registered_players int := 0;
  v_public_coaches int := 0;
  v_has_public_contact boolean := false;
begin
  select c.id, c.is_public, c.public_page_published_config
  into v_club_id, v_is_public, v_cfg
  from public.clubs c
  where c.slug = _club_slug
  limit 1;

  if v_club_id is null then
    return null::jsonb;
  end if;

  if v_cfg is not null then
    vr := coalesce(v_cfg->'visibilityRules', '{}'::jsonb);
    v_hide_coach_names := coalesce((vr->>'hide_coach_names_public')::boolean, false);
    v_hide_coach_contact := coalesce((vr->>'hide_coach_contact_public')::boolean, false);
    v_hide_training_loc := coalesce((vr->>'hide_training_locations_public')::boolean, false);
    v_hide_match_scores := coalesce((vr->>'hide_match_results_public')::boolean, false);
    v_hide_player_stats := coalesce((vr->>'hide_player_stats_public')::boolean, false);
    v_youth := coalesce((vr->>'youth_protection_mode')::boolean, false);
    v_youth_hide_images := coalesce((vr->>'youth_hide_public_player_images')::boolean, false);
    v_youth_allow_phone := coalesce((v_cfg->'privacy'->>'youth_allow_coach_phone_public')::boolean, false);
    if v_youth then
      v_hide_player_stats := true;
      if not v_youth_allow_phone then
        v_hide_coach_contact := true;
      end if;
    end if;
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

  if coalesce(v_team.public_website_visible, true) is not true then
    if auth.uid() is null or not public.is_member_of_club(auth.uid(), v_club_id) then
      return null::jsonb;
    end if;
  end if;

  select count(*)::int
  into v_registered_players
  from public.team_players tp
  where tp.team_id = _team_id;

  select count(*)::int
  into v_public_coaches
  from public.team_coaches tc
  where tc.team_id = _team_id
    and coalesce(tc.show_on_public_website, false) is true;

  select exists (
    select 1
    from public.team_coaches tc
    where tc.team_id = _team_id
      and coalesce(tc.show_on_public_website, false) is true
      and nullif(trim(tc.public_contact_email), '') is not null
  )
  into v_has_public_contact;

  with coach_rows as (
    select
      tc.show_on_public_website,
      tc.public_contact_email,
      tc.membership_id,
      tc.placeholder_id
    from public.team_coaches tc
    where tc.team_id = _team_id
      and coalesce(tc.show_on_public_website, false) is true
  ),
  coach_names as (
    select
      nullif(
        trim(
          both
          from coalesce(nullif(trim(p.display_name), ''), nullif(trim(cpp.display_name), ''))
        ),
        ''
      ) as nm,
      nullif(trim(cr.public_contact_email), '') as contact_email
    from coach_rows cr
    left join public.club_memberships cm
      on cm.id = cr.membership_id
     and cm.club_id = v_club_id
     and cm.status = 'active'
    left join public.profiles p on p.user_id = cm.user_id
    left join public.club_person_placeholders cpp
      on cpp.id = cr.placeholder_id
     and cpp.club_id = v_club_id
  ),
  coach_distinct as (
    select distinct on (nm) nm, contact_email
    from coach_names
    where nm is not null
    order by nm, contact_email nulls last
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', d.nm,
        'contact_email', d.contact_email
      )
      order by d.nm
    ),
    '[]'::jsonb
  )
  into v_coaches
  from coach_distinct d;

  if v_hide_coach_names then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', '',
          'contact_email', e->'contact_email'
        )
      ),
      '[]'::jsonb
    )
    into v_coaches
    from jsonb_array_elements(coalesce(v_coaches, '[]'::jsonb)) as e;
  end if;

  if v_hide_coach_contact then
    select coalesce(
      jsonb_agg(jsonb_set(e, '{contact_email}', 'null'::jsonb, true)),
      '[]'::jsonb
    )
    into v_coaches
    from jsonb_array_elements(coalesce(v_coaches, '[]'::jsonb)) as e;
  end if;

  if coalesce(v_team.public_training_schedule_visible, true) is true then
    select coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'source', 'activity'::text,
            'id', x.id::text,
            'title', x.title,
            'starts_at', x.starts_at,
            'ends_at', x.ends_at,
            'location', case when v_hide_training_loc then null else x.location end
          )
          order by x.starts_at asc
        )
        from (
          select a.id, a.title, a.starts_at, a.ends_at, a.location
          from public.activities a
          where a.club_id = v_club_id
            and a.team_id = _team_id
            and a.type = 'training'
            and coalesce(a.publish_to_public_schedule, true) = true
            and a.starts_at >= (now() - interval '1 day')
          order by a.starts_at asc
          limit 50
        ) x
      ),
      '[]'::jsonb
    )
    into v_trainings;
  else
    v_trainings := '[]'::jsonb;
  end if;

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
          'home_score', case when v_hide_match_scores then null else m.home_score end,
          'away_score', case when v_hide_match_scores then null else m.away_score end
        )
        order by m.match_date asc nulls last
      )
      from (
        select mm.id, mm.opponent, mm.is_home, mm.match_date, mm.location, mm.status, mm.home_score, mm.away_score
        from public.matches mm
        where mm.club_id = v_club_id
          and mm.team_id = _team_id
          and coalesce(mm.publish_to_public_schedule, true) = true
          and mm.match_date >= (now() - interval '1 day')
        order by mm.match_date asc nulls last
        limit 12
      ) m
    ),
    '[]'::jsonb
  )
  into v_matches;

  select (
    select jsonb_build_object(
      'id', mm.id,
      'opponent', mm.opponent,
      'is_home', mm.is_home,
      'match_date', mm.match_date,
      'location', mm.location,
      'status', mm.status,
      'home_score', case when v_hide_match_scores then null else mm.home_score end,
      'away_score', case when v_hide_match_scores then null else mm.away_score end
    )
    from public.matches mm
    where mm.club_id = v_club_id
      and mm.team_id = _team_id
      and coalesce(mm.publish_to_public_schedule, true) = true
      and mm.match_date >= (now() - interval '1 day')
    order by mm.match_date asc nulls last
    limit 1
  )
  into v_next_match;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'title', n.title,
          'created_at', n.created_at,
          'excerpt', coalesce(nullif(trim(n.excerpt), ''), left(n.content, 200)),
          'image_url', case when v_youth_hide_images then null else n.image_url end
        )
        order by n.created_at desc
      )
      from (
        select a.id, a.title, a.created_at, a.content, a.excerpt, a.image_url
        from public.announcements a
        where a.club_id = v_club_id
          and a.team_id = _team_id
          and coalesce(a.publish_to_public_website, false) is true
        order by a.created_at desc
        limit 6
      ) n
    ),
    '[]'::jsonb
  )
  into v_news;

  if coalesce(v_team.public_documents_visible, true) is true then
    v_documents := coalesce(v_team.public_document_links, '[]'::jsonb);
  else
    v_documents := '[]'::jsonb;
  end if;

  v_stats := jsonb_build_object(
    'registered_players', case when v_hide_player_stats then 0 else v_registered_players end,
    'public_coaches', v_public_coaches,
    'upcoming_trainings', coalesce(jsonb_array_length(v_trainings), 0)
  );

  return jsonb_build_object(
    'team',
    jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'sport', v_team.sport,
      'age_group', v_team.age_group,
      'league', v_team.league,
      'coach_name', null,
      'public_description', v_team.public_description,
      'has_public_coach_contact', case when v_hide_coach_contact then false else v_has_public_contact end
    ),
    'coaches', v_coaches,
    'players', v_players,
    'trainings', v_trainings,
    'matches', v_matches,
    'next_match', v_next_match,
    'news', coalesce(v_news, '[]'::jsonb),
    'documents', coalesce(v_documents, '[]'::jsonb),
    'stats', v_stats
  );
end;
$$;

revoke all on function public.get_public_club_team_page(text, uuid) from public;
grant execute on function public.get_public_club_team_page(text, uuid) to anon, authenticated;
