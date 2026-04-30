-- Fix club_role_assignments SELECT policy guard to use named args.
-- This avoids subtle breakage if is_member_of_club argument order changes between environments.

alter table if exists public.club_role_assignments enable row level security;

drop policy if exists club_role_assignments_select_members on public.club_role_assignments;
create policy club_role_assignments_select_members
  on public.club_role_assignments
  for select
  to authenticated
  using (public.is_member_of_club(_club_id := club_id, _user_id := auth.uid()));

