-- Fix /my-data showing every club member for Team Management and picking the wrong
-- person after refresh. Prefer self/guardian/household actor over trainer; scope the
-- editable list to self-service paths (trainers still see assigned team players).

create or replace function public.get_member_master_edit_actor(
  _user_id uuid,
  _membership_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_club_id uuid;
begin
  if _user_id is null or _membership_id is null then
    return 'none';
  end if;

  select cm.club_id into v_club_id
  from public.club_memberships cm
  where cm.id = _membership_id
    and cm.status = 'active';

  if v_club_id is null then
    return 'none';
  end if;

  if public.can_manage_club_members(_user_id, v_club_id)
     and not public.is_own_membership(_user_id, _membership_id) then
    return 'manager';
  end if;

  if public.is_own_membership(_user_id, _membership_id)
     or public.is_guardian_for_member(_user_id, _membership_id)
     or public.shares_login_email_with_membership(_user_id, _membership_id) then
    return 'self';
  end if;

  if public.is_trainer_for_member(_user_id, _membership_id) then
    return 'trainer';
  end if;

  if public.can_manage_club_members(_user_id, v_club_id) then
    return 'manager';
  end if;

  return 'none';
end;
$$;

revoke all on function public.get_member_master_edit_actor(uuid, uuid) from public;
grant execute on function public.get_member_master_edit_actor(uuid, uuid) to authenticated;

create or replace function public.list_editable_member_master_memberships(_club_id uuid)
returns table (
  membership_id uuid,
  club_id uuid,
  display_name text,
  role text,
  team_label text,
  email text,
  edit_actor text,
  relationship text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_member_of_club(v_uid, _club_id) then
    raise exception 'Not authorized';
  end if;

  return query
  with candidates as (
    select cm.id as membership_id
    from public.club_memberships cm
    where cm.club_id = _club_id
      and cm.status = 'active'
      and (
        public.is_own_membership(v_uid, cm.id)
        or public.is_guardian_for_member(v_uid, cm.id)
        or public.shares_login_email_with_membership(v_uid, cm.id)
        or public.is_trainer_for_member(v_uid, cm.id)
      )
  )
  select
    cm.id::uuid,
    cm.club_id::uuid,
    coalesce(
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
      p.display_name,
      u.email
    )::text as display_name,
    cm.role::text,
    coalesce(nullif(trim(cm.team), ''), nullif(trim(cm.age_group), ''))::text as team_label,
    coalesce(u.email, '')::text as email,
    public.get_member_master_edit_actor(v_uid, cm.id)::text as edit_actor,
    (case
      when public.is_own_membership(v_uid, cm.id) then 'self'
      when public.is_guardian_for_member(v_uid, cm.id) then 'guardian'
      when public.shares_login_email_with_membership(v_uid, cm.id) then 'household_email'
      when public.is_trainer_for_member(v_uid, cm.id) then 'team_trainer'
      when public.can_manage_club_members(v_uid, cm.club_id) then 'manager'
      else null
    end)::text as relationship
  from candidates c
  join public.club_memberships cm on cm.id = c.membership_id
  left join public.club_member_master_records m on m.membership_id = cm.id
  left join public.profiles p on p.user_id = cm.user_id
  left join auth.users u on u.id = cm.user_id
  order by
    case
      when public.is_own_membership(v_uid, cm.id) then 0
      when public.is_guardian_for_member(v_uid, cm.id) then 1
      when public.shares_login_email_with_membership(v_uid, cm.id) then 2
      else 3
    end,
    coalesce(
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
      p.display_name,
      u.email
    ) asc nulls last;
end;
$$;

revoke all on function public.list_editable_member_master_memberships(uuid) from public;
grant execute on function public.list_editable_member_master_memberships(uuid) to authenticated;

notify pgrst, 'reload schema';
