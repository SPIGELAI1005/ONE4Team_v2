-- Extended membership application data (e.g. TSV Allach online registration fields).

alter table public.club_invite_requests
  add column if not exists application_payload jsonb;

comment on column public.club_invite_requests.application_payload is
  'Structured membership application fields (address, player history, SEPA, etc.).';

-- Extend public invite RPC
drop function if exists public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text);

create or replace function public.request_club_invite(
  _club_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _message text default null,
  _phone text default null,
  _interested_role text default null,
  _interested_team text default null,
  _consent boolean default false,
  _website_url text default null,
  _application_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_email text;
  v_id uuid;
  v_phone text;
  v_role text;
  v_team text;
  v_fn text;
  v_ln text;
  v_display text;
begin
  if _club_id is null then
    raise exception 'Missing club id';
  end if;

  if nullif(trim(coalesce(_website_url, '')), '') is not null then
    raise exception 'Unable to submit request.';
  end if;

  if coalesce(_consent, false) is not true then
    raise exception 'Consent is required';
  end if;

  select c.is_public into v_is_public
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public invite requests';
  end if;

  if not public.club_accepts_public_join_requests(_club_id) then
    raise exception 'This club is not accepting public invite requests';
  end if;

  v_fn := trim(coalesce(_first_name, ''));
  v_ln := trim(coalesce(_last_name, ''));
  if length(v_fn) < 1 or length(v_ln) < 1 then
    raise exception 'First and last name are required';
  end if;

  v_display := v_fn || ' ' || v_ln;

  v_email := lower(trim(coalesce(_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Valid email is required';
  end if;

  v_phone := nullif(trim(coalesce(_phone, '')), '');
  v_role := nullif(trim(coalesce(_interested_role, '')), '');
  v_team := nullif(trim(coalesce(_interested_team, '')), '');

  perform public.enforce_request_rate_limit(
    'public_invite_request',
    _club_id,
    v_email,
    3,
    interval '24 hours'
  );

  insert into public.club_invite_requests (
    club_id, name, email, message, status,
    phone, interested_role, interested_team, consent_at,
    source, first_name, last_name, application_payload
  )
  values (
    _club_id,
    v_display,
    v_email,
    nullif(trim(coalesce(_message, '')), ''),
    'pending',
    v_phone,
    v_role,
    v_team,
    now(),
    'public_club_page',
    v_fn,
    v_ln,
    _application_payload
  )
  returning id into v_id;

  perform public._notify_club_join_request_created(_club_id, v_id, v_display);

  return v_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this email.';
end;
$$;

revoke all on function public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text, jsonb) from public;
grant execute on function public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text, jsonb) to anon;
grant execute on function public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text, jsonb) to authenticated;

-- Extend authenticated join RPC
drop function if exists public.register_club_join_request(uuid, text, text, text, text, text, boolean, text, text, text);

create or replace function public.register_club_join_request(
  _club_id uuid,
  _name text,
  _message text default null,
  _phone text default null,
  _interested_role text default null,
  _interested_team text default null,
  _consent boolean default true,
  _first_name text default null,
  _last_name text default null,
  _website_url text default null,
  _application_payload jsonb default null
)
returns table (
  outcome text,
  role public.app_role,
  club_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_is_public boolean;
  v_mode text;
  v_default_role public.app_role;
  v_default_team text;
  v_request_id uuid;
  v_phone text;
  v_role text;
  v_team text;
  v_fn text;
  v_ln text;
  v_display text;
  v_allow_join boolean;
  v_auto_invited_only boolean;
  v_has_invite boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  if nullif(trim(coalesce(_website_url, '')), '') is not null then
    raise exception 'Unable to submit request.';
  end if;

  if coalesce(_consent, false) is not true then
    raise exception 'Consent is required';
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email = '' then
    raise exception 'Account email required';
  end if;

  v_phone := nullif(trim(coalesce(_phone, '')), '');
  v_role := nullif(trim(coalesce(_interested_role, '')), '');
  v_team := nullif(trim(coalesce(_interested_team, '')), '');

  v_fn := nullif(trim(coalesce(_first_name, '')), '');
  v_ln := nullif(trim(coalesce(_last_name, '')), '');
  if v_fn is not null and v_ln is not null then
    v_display := v_fn || ' ' || v_ln;
  else
    v_display := coalesce(nullif(trim(coalesce(_name, '')), ''), split_part(v_email, '@', 1));
  end if;

  select
    c.is_public,
    c.join_approval_mode,
    c.join_default_role,
    c.join_default_team,
    coalesce(c.join_auto_approve_invited_only, false)
  into
    v_is_public,
    v_mode,
    v_default_role,
    v_default_team,
    v_auto_invited_only
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public requests';
  end if;

  v_allow_join := public.club_accepts_public_join_requests(_club_id);
  if not v_allow_join then
    raise exception 'This club is not accepting public join requests';
  end if;

  if exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = _club_id
      and cm.user_id = v_user_id
      and cm.status = 'active'
  ) then
    outcome := 'already_member';
    role := coalesce(v_default_role, 'member');
    club_id := _club_id;
    return next;
    return;
  end if;

  perform public.enforce_request_rate_limit(
    'public_join_request',
    _club_id,
    v_user_id::text,
    10,
    interval '1 hour'
  );

  select exists (
    select 1
    from public.club_invites ci
    where ci.club_id = _club_id
      and lower(ci.email) = v_email
      and ci.status = 'pending'
      and (ci.expires_at is null or ci.expires_at > now())
  ) into v_has_invite;

  if coalesce(v_mode, 'manual') = 'auto' then
    if v_auto_invited_only and not v_has_invite then
      null;
    else
      insert into public.club_memberships (club_id, user_id, role, status, team)
      values (
        _club_id,
        v_user_id,
        coalesce(v_default_role, 'member'),
        'active',
        nullif(trim(coalesce(v_default_team, '')), '')
      )
      on conflict (club_id, user_id)
      do update set
        status = 'active',
        role = excluded.role,
        team = coalesce(excluded.team, public.club_memberships.team);

      outcome := 'joined';
      role := coalesce(v_default_role, 'member');
      club_id := _club_id;
      return next;
      return;
    end if;
  end if;

  begin
    insert into public.club_invite_requests (
      club_id, name, email, message, status, request_user_id,
      phone, interested_role, interested_team, consent_at,
      source, first_name, last_name, application_payload
    )
    values (
      _club_id,
      v_display,
      v_email,
      nullif(trim(coalesce(_message, '')), ''),
      'pending',
      v_user_id,
      v_phone,
      v_role,
      v_team,
      now(),
      'public_club_page',
      v_fn,
      v_ln,
      _application_payload
    )
    returning id into v_request_id;
  exception
    when unique_violation then
      update public.club_invite_requests cir
      set
        name = v_display,
        message = nullif(trim(coalesce(_message, '')), ''),
        request_user_id = v_user_id,
        phone = coalesce(v_phone, cir.phone),
        interested_role = coalesce(v_role, cir.interested_role),
        interested_team = coalesce(v_team, cir.interested_team),
        consent_at = now(),
        source = coalesce(cir.source, 'public_club_page'),
        first_name = coalesce(v_fn, cir.first_name),
        last_name = coalesce(v_ln, cir.last_name),
        application_payload = coalesce(_application_payload, cir.application_payload)
      where cir.club_id = _club_id
        and lower(cir.email) = v_email
        and cir.status = 'pending'
      returning cir.id into v_request_id;
  end;

  perform public._notify_club_join_request_created(_club_id, v_request_id, v_display);

  outcome := 'pending';
  role := coalesce(v_default_role, 'member');
  club_id := _club_id;
  return next;
end;
$$;

revoke all on function public.register_club_join_request(uuid, text, text, text, text, text, boolean, text, text, text, jsonb) from public;
grant execute on function public.register_club_join_request(uuid, text, text, text, text, text, boolean, text, text, text, jsonb) to authenticated;
