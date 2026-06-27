-- Announcement fan-out previously skipped the author. Clubs with one active member
-- (often the admin posting) never received Updates notifications.

create or replace function public.fanout_announcement_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id, is_read)
  select
    new.club_id,
    cm.user_id,
    new.title,
    left(new.content, 240),
    'announcement',
    new.id,
    cm.user_id = new.author_id
  from public.club_memberships cm
  where cm.club_id = new.club_id
    and cm.status = 'active'
    and public.can_access_team_message(cm.user_id, new.club_id, new.team_id, false);

  return new;
end;
$$;

-- Backfill Updates rows for announcements created while fan-out failed or excluded the author.
insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id, is_read)
select
  a.club_id,
  cm.user_id,
  a.title,
  left(a.content, 240),
  'announcement',
  a.id,
  cm.user_id = a.author_id
from public.announcements a
join public.club_memberships cm
  on cm.club_id = a.club_id
 and cm.status = 'active'
where public.can_access_team_message(cm.user_id, a.club_id, a.team_id, false)
  and not exists (
    select 1
    from public.notifications n
    where n.reference_id = a.id
      and n.user_id = cm.user_id
      and n.notification_type = 'announcement'
  );

notify pgrst, 'reload schema';
