-- Repair: list_club_membership_emails was missing on some environments despite
-- 20260324120000 being recorded as applied (partial apply / manual drift).

create or replace function public.list_club_membership_emails(_club_id uuid)
returns table (
  membership_id uuid,
  email text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    cm.id as membership_id,
    coalesce(u.email, '') as email
  from public.club_memberships cm
  join auth.users u on u.id = cm.user_id
  where cm.club_id = _club_id
    and cm.status = 'active'
    and public.is_club_admin(auth.uid(), _club_id);
$$;

revoke all on function public.list_club_membership_emails(uuid) from public;
grant execute on function public.list_club_membership_emails(uuid) to authenticated;

notify pgrst, 'reload schema';
