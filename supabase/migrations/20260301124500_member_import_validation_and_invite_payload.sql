-- Persist invite import metadata and expose member-email lookup for admin import validation.

alter table public.club_invites
  add column if not exists invite_payload jsonb not null default '{}'::jsonb;

create or replace function public.lookup_club_member_emails(
  _club_id uuid,
  _emails text[]
)
returns table (
  email text,
  is_member boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_club_admin(auth.uid(), _club_id) then
    raise exception 'Only club admins can validate import emails';
  end if;

  return query
  with normalized as (
    select distinct lower(trim(value)) as email
    from unnest(coalesce(_emails, array[]::text[])) as value
    where trim(value) <> ''
  )
  select
    n.email,
    exists (
      select 1
      from auth.users u
      join public.club_memberships cm
        on cm.user_id = u.id
       and cm.club_id = _club_id
       and cm.status = 'active'
      where lower(u.email) = n.email
    ) as is_member
  from normalized n;
end;
$$;

revoke all on function public.lookup_club_member_emails(uuid, text[]) from public;
grant execute on function public.lookup_club_member_emails(uuid, text[]) to authenticated;

create or replace function public.redeem_club_invite(_token text)
returns table (
  club_id uuid,
  role public.app_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_inv public.club_invites%rowtype;
  v_user_id uuid;
  v_email text;
  v_team text;
  v_age_group text;
  v_position text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _token is null or length(trim(_token)) < 10 then
    raise exception 'Invalid token';
  end if;

  v_hash := encode(digest(_token, 'sha256'), 'hex');

  select * into v_inv
  from public.club_invites
  where token_hash = v_hash
  limit 1;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_inv.used_at is not null then
    raise exception 'Invite already used';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'Invite expired';
  end if;

  if v_inv.email is not null then
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    if v_email = '' or v_email <> lower(v_inv.email) then
      raise exception 'Invite email mismatch';
    end if;
  end if;

  v_team := nullif(trim(coalesce(v_inv.invite_payload ->> 'team', '')), '');
  v_age_group := nullif(trim(coalesce(v_inv.invite_payload ->> 'age_group', '')), '');
  v_position := nullif(trim(coalesce(v_inv.invite_payload ->> 'position', '')), '');

  insert into public.club_memberships (club_id, user_id, role, status, team, age_group, position)
  values (v_inv.club_id, v_user_id, v_inv.role, 'active', v_team, v_age_group, v_position)
  on conflict (club_id, user_id)
  do update set
    role = excluded.role,
    status = 'active',
    team = coalesce(excluded.team, public.club_memberships.team),
    age_group = coalesce(excluded.age_group, public.club_memberships.age_group),
    position = coalesce(excluded.position, public.club_memberships.position);

  update public.club_invites
  set used_at = now()
  where id = v_inv.id;

  club_id := v_inv.club_id;
  role := v_inv.role;
  return next;
end;
$$;

revoke all on function public.redeem_club_invite(text) from public;
grant execute on function public.redeem_club_invite(text) to authenticated;
