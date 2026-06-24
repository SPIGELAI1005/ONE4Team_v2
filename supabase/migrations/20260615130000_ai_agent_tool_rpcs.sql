-- AI 4 T Agent tool RPCs (security definer; caller _user_id must be trainer+).

create or replace function public.agent_create_training(
  _club_id uuid,
  _user_id uuid,
  _team_id uuid,
  _title text,
  _starts_at timestamptz,
  _ends_at timestamptz,
  _location text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _activity_id uuid;
  _team_ok boolean;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    raise exception 'not_member';
  end if;
  if not public.is_club_trainer(_user_id, _club_id) then
    raise exception 'not_authorized';
  end if;
  if _team_id is not null then
    select exists(
      select 1 from public.teams t where t.id = _team_id and t.club_id = _club_id
    ) into _team_ok;
    if not _team_ok then
      raise exception 'invalid_team';
    end if;
  end if;
  if _starts_at is null or _ends_at is null or _ends_at <= _starts_at then
    raise exception 'invalid_times';
  end if;
  if coalesce(trim(_title), '') = '' then
    raise exception 'invalid_title';
  end if;

  insert into public.activities (
    club_id,
    type,
    title,
    starts_at,
    ends_at,
    location,
    team_id,
    created_by
  )
  values (
    _club_id,
    'training',
    trim(_title),
    _starts_at,
    _ends_at,
    nullif(trim(_location), ''),
    _team_id,
    _user_id
  )
  returning id into _activity_id;

  return jsonb_build_object(
    'ok', true,
    'activity_id', _activity_id,
    'summary', 'Training created.'
  );
exception
  when undefined_table then
    raise exception 'activities_table_missing';
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

  delete from public.activities where id = _activity_id;

  return jsonb_build_object(
    'ok', true,
    'activity_id', _activity_id,
    'title', _row.title,
    'summary', coalesce(nullif(trim(_reason), ''), 'Training cancelled.')
  );
exception
  when undefined_table then
    raise exception 'activities_table_missing';
end;
$$;

grant execute on function public.agent_create_training(uuid, uuid, uuid, text, timestamptz, timestamptz, text)
  to authenticated, service_role;
grant execute on function public.agent_cancel_training(uuid, uuid, uuid, text)
  to authenticated, service_role;
