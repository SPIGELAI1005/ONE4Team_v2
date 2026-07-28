-- Fix GROUP BY/order lint in overloaded membership activity heatmap.

create or replace function public.get_membership_activity_heatmap(
  _club_id uuid,
  _days integer default 30
)
returns table (
  membership_id uuid,
  display_name text,
  day_bucket date,
  activity_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _start date;
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.is_member_of_club(auth.uid(), _club_id) then
    return;
  end if;

  _start := (now() - make_interval(days => greatest(7, least(coalesce(_days, 30), 365))))::date;

  return query
  with members as (
    select
      cm.id as membership_id,
      cm.user_id,
      coalesce(p.display_name, 'Member') as display_name
    from public.club_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
    where cm.club_id = _club_id
      and cm.status = 'active'
  ),
  msg as (
    select
      m.sender_id as user_id,
      date_trunc('day', m.created_at)::date as day_bucket,
      count(*)::integer as activity_count
    from public.messages m
    where m.club_id = _club_id
      and m.created_at::date >= _start
    group by m.sender_id, date_trunc('day', m.created_at)::date
  ),
  att as (
    select
      aa.membership_id,
      date_trunc('day', a.starts_at)::date as day_bucket,
      count(*)::integer as activity_count
    from public.activity_attendance aa
    join public.activities a on a.id = aa.activity_id
    where aa.club_id = _club_id
      and aa.status in ('confirmed', 'attended')
      and a.starts_at::date >= _start
    group by aa.membership_id, date_trunc('day', a.starts_at)::date
  ),
  merged as (
    select
      mem.membership_id,
      mem.display_name,
      msg.day_bucket,
      msg.activity_count
    from members mem
    join msg on msg.user_id = mem.user_id
    union all
    select
      mem.membership_id,
      mem.display_name,
      att.day_bucket,
      att.activity_count
    from members mem
    join att on att.membership_id = mem.membership_id
  )
  select
    x.membership_id,
    x.display_name,
    x.day_bucket,
    sum(x.activity_count)::integer as activity_count
  from merged x
  group by x.membership_id, x.display_name, x.day_bucket
  order by x.day_bucket asc, sum(x.activity_count) desc;
end;
$$;
