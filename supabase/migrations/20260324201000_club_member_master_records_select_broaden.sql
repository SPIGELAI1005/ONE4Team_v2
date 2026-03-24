-- Broaden SELECT beyond the original "membership role admin|trainer" check:
--   - is_club_admin() covers legacy club admins and (once 20260324140000 is applied) assignment-based club admins.
--   - Explicit trainer membership branch keeps trainers readable even if is_club_admin() semantics differ.
-- Does not reference club_role_assignments so this migration applies without the RBAC migration.

drop policy if exists "club_member_master_select_staff" on public.club_member_master_records;

create policy "club_member_master_select_staff"
  on public.club_member_master_records for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = club_member_master_records.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role = 'trainer'::public.app_role
    )
  );
