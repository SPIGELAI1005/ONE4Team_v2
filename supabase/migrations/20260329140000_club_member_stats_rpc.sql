-- Club-wide member counts for accurate dashboard stats when roster is server-paged.

create or replace function public.get_club_member_stats(_club_id uuid)
returns table (
  total_count bigint,
  active_count bigint,
  player_count bigint,
  trainer_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_member_of_club(auth.uid(), _club_id) then
    return;
  end if;

  return query
  select
    (select count(*)::bigint from public.club_memberships cm where cm.club_id = _club_id),
    (select count(*)::bigint from public.club_memberships cm where cm.club_id = _club_id and cm.status = 'active'),
    (select count(*)::bigint from public.club_memberships cm where cm.club_id = _club_id and cm.role = 'player'),
    (select count(*)::bigint from public.club_memberships cm where cm.club_id = _club_id and cm.role = 'trainer');
end;
$$;

revoke all on function public.get_club_member_stats(uuid) from public;
grant execute on function public.get_club_member_stats(uuid) to authenticated;
