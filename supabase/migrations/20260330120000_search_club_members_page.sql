-- Server-side roster search (2+ characters): profiles + master name fields + internal_club_number.
-- Pagination aligns with Members page size; guarded by is_member_of_club.

create or replace function public.search_club_members_page(
  _club_id uuid,
  _search text,
  _role_filter text default null,
  _limit int default 100,
  _offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := trim(coalesce(_search, ''));
  lim int := greatest(1, least(coalesce(_limit, 100), 500));
  off int := greatest(0, coalesce(_offset, 0));
  total bigint;
  items jsonb;
begin
  if auth.uid() is null or not public.is_member_of_club(auth.uid(), _club_id) then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  if length(q) < 2 then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  select count(*)::bigint into total
  from public.club_memberships cm
  inner join public.profiles p on p.user_id = cm.user_id
  left join public.club_member_master_records m on m.membership_id = cm.id
  where cm.club_id = _club_id
    and (
      _role_filter is null
      or trim(_role_filter) = ''
      or lower(trim(_role_filter)) = 'all'
      or cm.role::text = trim(_role_filter)
    )
    and (
      coalesce(p.display_name, '') ilike ('%' || q || '%')
      or coalesce(p.phone, '') ilike ('%' || q || '%')
      or coalesce(m.first_name, '') ilike ('%' || q || '%')
      or coalesce(m.last_name, '') ilike ('%' || q || '%')
      or coalesce(m.internal_club_number, '') ilike ('%' || q || '%')
    );

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into items
  from (
    select
      cm.id,
      cm.club_id,
      cm.user_id,
      cm.role,
      cm.position,
      cm.age_group,
      cm.team,
      cm.status,
      cm.created_at,
      p.display_name as profile_display_name,
      p.avatar_url as profile_avatar_url,
      p.phone as profile_phone
    from public.club_memberships cm
    inner join public.profiles p on p.user_id = cm.user_id
    left join public.club_member_master_records m on m.membership_id = cm.id
    where cm.club_id = _club_id
      and (
        _role_filter is null
        or trim(_role_filter) = ''
        or lower(trim(_role_filter)) = 'all'
        or cm.role::text = trim(_role_filter)
      )
      and (
        coalesce(p.display_name, '') ilike ('%' || q || '%')
        or coalesce(p.phone, '') ilike ('%' || q || '%')
        or coalesce(m.first_name, '') ilike ('%' || q || '%')
        or coalesce(m.last_name, '') ilike ('%' || q || '%')
        or coalesce(m.internal_club_number, '') ilike ('%' || q || '%')
      )
    order by cm.created_at desc
    limit lim
    offset off
  ) t;

  return jsonb_build_object('total', coalesce(total, 0), 'items', coalesce(items, '[]'::jsonb));
end;
$$;

revoke all on function public.search_club_members_page(uuid, text, text, int, int) from public;
grant execute on function public.search_club_members_page(uuid, text, text, int, int) to authenticated;
