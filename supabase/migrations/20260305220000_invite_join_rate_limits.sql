-- Abuse controls: rate-limit public invite/join request funnels
-- Scope:
-- 1) add centralized request limiter ledger
-- 2) add reusable limiter helper
-- 3) enforce limits in public.request_club_invite
-- 4) enforce limits in public.register_club_join_request

create table if not exists public.request_rate_limits (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('public_invite_request', 'public_join_request')),
  club_id uuid not null references public.clubs(id) on delete cascade,
  identifier text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_request_rate_limits_lookup
  on public.request_rate_limits(action, club_id, identifier, created_at desc);

alter table public.request_rate_limits enable row level security;

create or replace function public.enforce_request_rate_limit(
  _action text,
  _club_id uuid,
  _identifier text,
  _max_attempts int,
  _window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identifier text;
  v_count int;
begin
  v_identifier := lower(trim(coalesce(_identifier, '')));
  if v_identifier = '' then
    raise exception 'Missing rate limit identifier';
  end if;

  if _club_id is null then
    raise exception 'Missing club id for rate limit';
  end if;

  if coalesce(_max_attempts, 0) <= 0 then
    raise exception 'Invalid rate limit max attempts';
  end if;

  if _window is null or _window <= interval '0 seconds' then
    raise exception 'Invalid rate limit window';
  end if;

  select count(*)
    into v_count
  from public.request_rate_limits rl
  where rl.action = _action
    and rl.club_id = _club_id
    and rl.identifier = v_identifier
    and rl.created_at > now() - _window;

  if v_count >= _max_attempts then
    raise exception 'Too many requests. Please try again later.';
  end if;

  insert into public.request_rate_limits(action, club_id, identifier)
  values (_action, _club_id, v_identifier);
end;
$$;

revoke all on function public.enforce_request_rate_limit(text, uuid, text, int, interval) from public;

create or replace function public.request_club_invite(
  _club_id uuid,
  _name text,
  _email text,
  _message text default null
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
begin
  if _club_id is null then
    raise exception 'Missing club id';
  end if;

  select c.is_public into v_is_public
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public invite requests';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'Name is required';
  end if;

  v_email := lower(trim(coalesce(_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Valid email is required';
  end if;

  perform public.enforce_request_rate_limit(
    'public_invite_request',
    _club_id,
    v_email,
    3,
    interval '24 hours'
  );

  insert into public.club_invite_requests (club_id, name, email, message, status)
  values (_club_id, trim(_name), v_email, nullif(trim(coalesce(_message, '')), ''), 'pending')
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this email.';
end;
$$;

revoke all on function public.request_club_invite(uuid, text, text, text) from public;
grant execute on function public.request_club_invite(uuid, text, text, text) to anon;
grant execute on function public.request_club_invite(uuid, text, text, text) to authenticated;

create or replace function public.register_club_join_request(
  _club_id uuid,
  _name text,
  _message text default null
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email = '' then
    raise exception 'Account email required';
  end if;

  select
    c.is_public,
    c.join_approval_mode,
    c.join_default_role,
    c.join_default_team
  into
    v_is_public,
    v_mode,
    v_default_role,
    v_default_team
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public requests';
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

  if coalesce(v_mode, 'manual') = 'auto' then
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

  begin
    insert into public.club_invite_requests (club_id, name, email, message, status, request_user_id)
    values (
      _club_id,
      coalesce(nullif(trim(coalesce(_name, '')), ''), split_part(v_email, '@', 1)),
      v_email,
      nullif(trim(coalesce(_message, '')), ''),
      'pending',
      v_user_id
    )
    returning id into v_request_id;
  exception
    when unique_violation then
      update public.club_invite_requests
      set
        name = coalesce(nullif(trim(coalesce(_name, '')), ''), split_part(v_email, '@', 1)),
        message = nullif(trim(coalesce(_message, '')), ''),
        request_user_id = v_user_id
      where club_id = _club_id
        and lower(email) = v_email
        and status = 'pending'
      returning id into v_request_id;
  end;

  outcome := 'pending';
  role := coalesce(v_default_role, 'member');
  club_id := _club_id;
  return next;
end;
$$;

revoke all on function public.register_club_join_request(uuid, text, text) from public;
grant execute on function public.register_club_join_request(uuid, text, text) to authenticated;
