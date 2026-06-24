-- Team-scoped training management for AI 4 T Agent (trainers per team; admins club-wide).

create or replace function public.is_user_assigned_team_trainer(
  _user_id uuid,
  _team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_coaches tc
    join public.club_memberships cm on cm.id = tc.membership_id
    where tc.team_id = _team_id
      and cm.user_id = _user_id
      and cm.status = 'active'
  )
  or exists (
    select 1
    from public.club_role_assignments cra
    join public.club_memberships cm on cm.id = cra.membership_id
    where cra.scope = 'team'
      and cra.scope_team_id = _team_id
      and cra.role_kind = 'trainer'
      and cm.user_id = _user_id
      and cm.status = 'active'
  );
$$;

create or replace function public.can_manage_team_training(
  _user_id uuid,
  _club_id uuid,
  _team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_club_admin(_user_id, _club_id) then true
    when _team_id is null then false
    else public.is_user_assigned_team_trainer(_user_id, _team_id)
  end;
$$;

create or replace function public.get_team_trainers_for_agent(_team_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'membership_id', cm.id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), cm.id::text),
        'email', coalesce(nullif(trim(u.email), ''), '')
      )
      order by p.display_name nulls last
    ),
    '[]'::jsonb
  )
  from public.team_coaches tc
  join public.club_memberships cm on cm.id = tc.membership_id and cm.status = 'active'
  left join public.profiles p on p.user_id = cm.user_id
  left join auth.users u on u.id = cm.user_id
  where tc.team_id = _team_id
    and tc.membership_id is not null;
$$;

create or replace function public.agent_validate_training_scope(
  _club_id uuid,
  _user_id uuid,
  _activity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _row public.activities%rowtype;
  _team_name text;
  _allowed boolean;
  _trainers jsonb;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    return jsonb_build_object('allowed', false, 'code', 'not_member');
  end if;

  select * into _row
  from public.activities a
  where a.id = _activity_id
    and a.club_id = _club_id
    and a.type = 'training';

  if not found then
    return jsonb_build_object('allowed', false, 'code', 'training_not_found');
  end if;

  _allowed := public.can_manage_team_training(_user_id, _club_id, _row.team_id);

  if _row.team_id is not null then
    select t.name into _team_name from public.teams t where t.id = _row.team_id;
    _trainers := public.get_team_trainers_for_agent(_row.team_id);
  else
    _team_name := null;
    _trainers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'allowed', _allowed,
    'code', case when _allowed then 'ok' else 'not_team_trainer' end,
    'activity_id', _row.id,
    'team_id', _row.team_id,
    'team_name', _team_name,
    'activity_title', _row.title,
    'starts_at', _row.starts_at,
    'suggested_trainers', _trainers
  );
exception
  when undefined_table then
    return jsonb_build_object('allowed', false, 'code', 'activities_table_missing');
end;
$$;

create or replace function public.agent_cancel_training(
  _club_id uuid,
  _user_id uuid,
  _activity_id uuid,
  _reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.activities%rowtype;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    raise exception 'not_member';
  end if;
  if not public.is_club_trainer(_user_id, _club_id) then
    raise exception 'not_authorized';
  end if;

  select * into _row
  from public.activities a
  where a.id = _activity_id
    and a.club_id = _club_id
    and a.type = 'training';

  if not found then
    raise exception 'training_not_found';
  end if;

  if not public.can_manage_team_training(_user_id, _club_id, _row.team_id) then
    raise exception 'not_team_trainer';
  end if;

  delete from public.activities where id = _activity_id;

  return jsonb_build_object(
    'ok', true,
    'activity_id', _activity_id,
    'team_id', _row.team_id,
    'title', _row.title,
    'summary', coalesce(nullif(trim(_reason), ''), 'Training cancelled.')
  );
exception
  when undefined_table then
    raise exception 'activities_table_missing';
end;
$$;

grant execute on function public.is_user_assigned_team_trainer(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_manage_team_training(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.get_team_trainers_for_agent(uuid) to authenticated, service_role;
grant execute on function public.agent_validate_training_scope(uuid, uuid, uuid) to authenticated, service_role;
