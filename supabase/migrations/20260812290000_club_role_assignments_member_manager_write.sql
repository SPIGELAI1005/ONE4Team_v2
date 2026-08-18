-- Team Management (and other member managers) can manage scoped role assignments
-- for operational roles. Club admins retain full assignment control.

create or replace function public.is_assignable_club_role_kind_by_member_manager(_role_kind text)
returns boolean
language sql
immutable
as $$
  select _role_kind in (
    'trainer',
    'player',
    'player_teen',
    'player_adult',
    'parent',
    'member',
    'fan',
    'supporter'
  );
$$;

create or replace function public.can_manage_club_role_assignments(
  _user_id uuid,
  _club_id uuid,
  _role_kind text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_club_admin(_user_id, _club_id)
    or (
      public.can_manage_club_members(_user_id, _club_id)
      and public.is_assignable_club_role_kind_by_member_manager(_role_kind)
    );
$$;

revoke all on function public.is_assignable_club_role_kind_by_member_manager(text) from public;
grant execute on function public.is_assignable_club_role_kind_by_member_manager(text) to authenticated;

revoke all on function public.can_manage_club_role_assignments(uuid, uuid, text) from public;
grant execute on function public.can_manage_club_role_assignments(uuid, uuid, text) to authenticated;

drop policy if exists club_role_assignments_admin_write on public.club_role_assignments;

create policy club_role_assignments_insert_manage
  on public.club_role_assignments for insert to authenticated
  with check (
    public.can_manage_club_role_assignments(auth.uid(), club_id, role_kind)
  );

create policy club_role_assignments_update_manage
  on public.club_role_assignments for update to authenticated
  using (
    public.can_manage_club_role_assignments(auth.uid(), club_id, role_kind)
  )
  with check (
    public.can_manage_club_role_assignments(auth.uid(), club_id, role_kind)
  );

create policy club_role_assignments_delete_manage
  on public.club_role_assignments for delete to authenticated
  using (
    public.can_manage_club_role_assignments(auth.uid(), club_id, role_kind)
  );

notify pgrst, 'reload schema';
