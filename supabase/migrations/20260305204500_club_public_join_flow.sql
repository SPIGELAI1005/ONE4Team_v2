-- Public club-page onboarding flow:
-- - club-level toggle for manual vs auto approval
-- - authenticated join request RPC
-- - admin approval RPC that can add membership directly

alter table public.clubs
  add column if not exists join_approval_mode text not null default 'manual' check (join_approval_mode in ('manual', 'auto')),
  add column if not exists join_reviewer_policy text not null default 'admin_only' check (join_reviewer_policy in ('admin_only', 'admin_trainer')),
  add column if not exists join_default_role public.app_role not null default 'member',
  add column if not exists join_default_team text;

alter table public.club_invite_requests
  add column if not exists request_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_club_invite_requests_request_user_id
  on public.club_invite_requests(request_user_id);

create or replace function public.can_review_club_join_requests(
  _user_id uuid,
  _club_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_club_admin(_user_id, _club_id)
    or exists (
      select 1
      from public.clubs c
      join public.club_memberships cm
        on cm.club_id = c.id
       and cm.user_id = _user_id
       and cm.status = 'active'
       and cm.role = 'trainer'
      where c.id = _club_id
        and c.join_reviewer_policy = 'admin_trainer'
    );
$$;

drop policy if exists "club_invite_requests_select_admin" on public.club_invite_requests;
create policy "club_invite_requests_select_admin"
  on public.club_invite_requests for select
  using (public.can_review_club_join_requests(auth.uid(), club_id));

drop policy if exists "club_invite_requests_update_admin" on public.club_invite_requests;
create policy "club_invite_requests_update_admin"
  on public.club_invite_requests for update
  using (public.can_review_club_join_requests(auth.uid(), club_id))
  with check (public.can_review_club_join_requests(auth.uid(), club_id));

drop policy if exists "club_invites_select_reviewer" on public.club_invites;
create policy "club_invites_select_reviewer"
  on public.club_invites for select
  using (public.can_review_club_join_requests(auth.uid(), club_id));

drop policy if exists "club_invites_insert_reviewer" on public.club_invites;
create policy "club_invites_insert_reviewer"
  on public.club_invites for insert
  with check (public.can_review_club_join_requests(auth.uid(), club_id));

drop policy if exists "club_invites_update_reviewer" on public.club_invites;
create policy "club_invites_update_reviewer"
  on public.club_invites for update
  using (public.can_review_club_join_requests(auth.uid(), club_id))
  with check (public.can_review_club_join_requests(auth.uid(), club_id));

drop policy if exists "club_invites_delete_reviewer" on public.club_invites;
create policy "club_invites_delete_reviewer"
  on public.club_invites for delete
  using (public.can_review_club_join_requests(auth.uid(), club_id));

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

  if coalesce(v_mode, 'manual') = 'auto' then
    insert into public.club_memberships (club_id, user_id, role, status, team)
    values (_club_id, v_user_id, coalesce(v_default_role, 'member'), 'active', nullif(trim(coalesce(v_default_team, '')), ''))
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

create or replace function public.approve_club_join_request(
  _request_id uuid
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
  v_request public.club_invite_requests%rowtype;
  v_default_role public.app_role;
  v_default_team text;
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

  if v_request.request_user_id is null then
    outcome := 'requires_invite';
    role := coalesce(v_default_role, 'member');
    club_id := v_request.club_id;
    return next;
    return;
  end if;

  insert into public.club_memberships (club_id, user_id, role, status, team)
  values (
    v_request.club_id,
    v_request.request_user_id,
    coalesce(v_default_role, 'member'),
    'active',
    nullif(trim(coalesce(v_default_team, '')), '')
  )
  on conflict (club_id, user_id)
  do update set
    status = 'active',
    role = excluded.role,
    team = coalesce(excluded.team, public.club_memberships.team);

  update public.club_invite_requests
  set status = 'approved'
  where id = v_request.id;

  outcome := 'joined';
  role := coalesce(v_default_role, 'member');
  club_id := v_request.club_id;
  return next;
end;
$$;

revoke all on function public.approve_club_join_request(uuid) from public;
grant execute on function public.approve_club_join_request(uuid) to authenticated;
