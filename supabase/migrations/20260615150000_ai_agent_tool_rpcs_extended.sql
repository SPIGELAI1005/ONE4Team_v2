-- AI 4 T Agent Phase 2–3: member draft + club announcement RPCs.

create or replace function public.agent_create_member_draft(
  _club_id uuid,
  _user_id uuid,
  _email text,
  _name text default null,
  _role text default 'member',
  _team text default null,
  _position text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _draft_id uuid;
  _role_enum public.app_role;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    raise exception 'not_member';
  end if;
  if not public.is_club_admin(_user_id, _club_id) then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(_email), '') = '' then
    raise exception 'invalid_email';
  end if;

  begin
    _role_enum := coalesce(_role, 'member')::public.app_role;
  exception
    when others then
      _role_enum := 'member'::public.app_role;
  end;

  insert into public.club_member_drafts (
    club_id,
    name,
    email,
    role,
    team,
    position,
    status,
    created_by
  )
  values (
    _club_id,
    nullif(trim(_name), ''),
    lower(trim(_email)),
    _role_enum,
    nullif(trim(_team), ''),
    nullif(trim(_position), ''),
    'draft',
    _user_id
  )
  returning id into _draft_id;

  return jsonb_build_object(
    'ok', true,
    'draft_id', _draft_id,
    'summary', 'Member draft created.'
  );
exception
  when undefined_table then
    raise exception 'club_member_drafts_missing';
end;
$$;

create or replace function public.agent_send_club_announcement(
  _club_id uuid,
  _user_id uuid,
  _title text,
  _content text,
  _priority text default 'normal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _announcement_id uuid;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    raise exception 'not_member';
  end if;
  if not public.is_club_trainer(_user_id, _club_id) then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(_title), '') = '' or coalesce(trim(_content), '') = '' then
    raise exception 'invalid_content';
  end if;

  insert into public.announcements (
    club_id,
    title,
    content,
    priority,
    author_id
  )
  values (
    _club_id,
    trim(_title),
    trim(_content),
    coalesce(nullif(trim(_priority), ''), 'normal'),
    _user_id
  )
  returning id into _announcement_id;

  return jsonb_build_object(
    'ok', true,
    'announcement_id', _announcement_id,
    'summary', 'Announcement posted.'
  );
exception
  when undefined_table then
    raise exception 'announcements_table_missing';
end;
$$;

grant execute on function public.agent_create_member_draft(uuid, uuid, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.agent_send_club_announcement(uuid, uuid, text, text, text)
  to authenticated, service_role;
