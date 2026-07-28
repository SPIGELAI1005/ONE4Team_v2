-- Runtime-safe hotfix:
-- Some environments do not have a UNIQUE constraint on (club_id, user_id)
-- in public.club_memberships, so ON CONFLICT fails at runtime.
-- Replace upserts with update-first + conditional insert.

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
#variable_conflict use_column
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
      and ci.used_at is null
      and (ci.expires_at is null or ci.expires_at > now())
      and ci.email is not null
      and lower(trim(ci.email)) = v_email
  ) into v_has_invite;

  if coalesce(v_mode, 'manual') = 'auto' then
    if v_auto_invited_only and not v_has_invite then
      null;
    else
      update public.club_memberships cm
      set
        status = 'active',
        role = coalesce(v_default_role, 'member'),
        team = coalesce(nullif(trim(coalesce(v_default_team, '')), ''), cm.team),
        updated_at = now()
      where cm.club_id = _club_id
        and cm.user_id = v_user_id;

      if not found then
        insert into public.club_memberships (club_id, user_id, role, status, team)
        values (
          _club_id,
          v_user_id,
          coalesce(v_default_role, 'member'),
          'active',
          nullif(trim(coalesce(v_default_team, '')), '')
        );
      end if;

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


create or replace function public.approve_club_join_request(
  _request_id uuid,
  _membership_role public.app_role default null,
  _membership_team text default null
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
#variable_conflict use_column
declare
  v_request public.club_invite_requests%rowtype;
  v_default_role public.app_role;
  v_default_team text;
  v_target_role public.app_role;
  v_target_team text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_request
  from public.club_invite_requests
  where id = _request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if not public.can_review_club_join_requests(auth.uid(), v_request.club_id) then
    raise exception 'Only configured reviewers can approve requests';
  end if;

  if v_request.status <> 'pending' then
    outcome := 'already_processed';
    role := 'member';
    club_id := v_request.club_id;
    return next;
    return;
  end if;

  select c.join_default_role, c.join_default_team
  into v_default_role, v_default_team
  from public.clubs c
  where c.id = v_request.club_id;

  v_target_role := coalesce(_membership_role, v_default_role, 'member'::public.app_role);
  v_target_team := coalesce(
    nullif(trim(coalesce(_membership_team, '')), ''),
    nullif(trim(coalesce(v_default_team, '')), '')
  );

  if v_request.request_user_id is null then
    outcome := 'requires_invite';
    role := v_target_role;
    club_id := v_request.club_id;
    return next;
    return;
  end if;

  update public.club_memberships cm
  set
    status = 'active',
    role = v_target_role,
    team = coalesce(v_target_team, cm.team),
    updated_at = now()
  where cm.club_id = v_request.club_id
    and cm.user_id = v_request.request_user_id;

  if not found then
    insert into public.club_memberships (club_id, user_id, role, status, team)
    values (
      v_request.club_id,
      v_request.request_user_id,
      v_target_role,
      'active',
      v_target_team
    );
  end if;

  update public.club_invite_requests
  set status = 'approved'
  where id = v_request.id;

  outcome := 'joined';
  role := v_target_role;
  club_id := v_request.club_id;
  return next;
end;
$$;
