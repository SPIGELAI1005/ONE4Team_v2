-- High-impact auth/join reliability repairs:
-- - register_club_join_request: remove invalid club_invites.status reference
-- - approve_club_join_request: avoid PL/pgSQL column/variable ambiguity on upsert
-- - create_club_with_admin: write announcements.author_id (not created_by)
--
-- Intention: prevent runtime errors in login/join/create-club flows.

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
      and ci.used_at is null
      and (ci.expires_at is null or ci.expires_at > now())
      and ci.email is not null
      and lower(trim(ci.email)) = v_email
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

  insert into public.club_memberships (club_id, user_id, role, status, team)
  values (
    v_request.club_id,
    v_request.request_user_id,
    v_target_role,
    'active',
    v_target_team
  )
  on conflict on constraint club_memberships_club_id_user_id_key
  do update set
    status = 'active',
    role = excluded.role,
    team = coalesce(excluded.team, public.club_memberships.team);

  update public.club_invite_requests
  set status = 'approved'
  where id = v_request.id;

  outcome := 'joined';
  role := v_target_role;
  club_id := v_request.club_id;
  return next;
end;
$$;

revoke all on function public.approve_club_join_request(uuid, public.app_role, text) from public;
grant execute on function public.approve_club_join_request(uuid, public.app_role, text) to authenticated;


create or replace function public.create_club_with_admin(
  _name text,
  _slug text,
  _description text default null,
  _is_public boolean default true,
  _plan_id text default 'kickoff',
  _metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _user_id uuid;
  _team_id uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _name is null or length(trim(_name)) = 0 then
    raise exception 'Club name is required';
  end if;
  if length(_name) > 100 then
    raise exception 'Club name must be under 100 characters';
  end if;
  if _description is not null and length(_description) > 500 then
    raise exception 'Description must be under 500 characters';
  end if;

  insert into public.clubs (
    name, slug, description, is_public,
    default_language, timezone, season_start_month
  )
  values (
    trim(_name), _slug, trim(_description), _is_public,
    coalesce(_metadata->>'language', 'en'),
    coalesce(_metadata->>'timezone', 'Europe/Berlin'),
    coalesce((_metadata->>'season_start_month')::int, 7)
  )
  returning id into _club_id;

  -- Admin membership; trg_club_memberships_ensure_assignment seeds club_role_assignments.
  insert into public.club_memberships (club_id, user_id, role, status)
  values (_club_id, _user_id, 'admin', 'active');

  -- Best-effort default team (no is_active column on teams).
  begin
    insert into public.teams (club_id, name, age_group)
    values (_club_id, trim(_name) || ' - First Team', 'Senior')
    returning id into _team_id;
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.announcements (club_id, title, content, author_id)
    values (
      _club_id,
      'Welcome to ' || trim(_name) || '!',
      'Your club has been created successfully on ONE4Team. Start by inviting your team members, setting up your teams, and configuring your club page.',
      _user_id
    );
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.billing_subscriptions (club_id, plan_id, billing_cycle, status, metadata)
    values (_club_id, _plan_id, 'monthly', 'trialing', _metadata)
    on conflict (club_id) do nothing;
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.shop_categories (club_id, name, is_active)
    values
      (_club_id, 'Jerseys', true),
      (_club_id, 'Training Gear', true),
      (_club_id, 'Fan Articles', true),
      (_club_id, 'Accessories', true);
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  return _club_id;
end;
$$;
