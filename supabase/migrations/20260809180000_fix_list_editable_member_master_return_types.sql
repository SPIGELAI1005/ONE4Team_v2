-- Fix PostgREST error: "structure of query does not match function result type"
-- Explicit ::text casts on all returned columns (varchar/enum coalesce mismatch).

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
      and public.can_edit_member_master_record(v_uid, cm.id)
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
    case public.get_member_master_edit_actor(v_uid, cm.id)
      when 'self' then 0
      when 'trainer' then 1
      when 'manager' then 2
      else 3
    end,
    3 asc;
end;
$$;

revoke all on function public.list_editable_member_master_memberships(uuid) from public;
grant execute on function public.list_editable_member_master_memberships(uuid) to authenticated;

notify pgrst, 'reload schema';
