-- The trainers-channel migration added a 4-arg can_access_team_message with a default
-- 4th parameter but left the original 3-arg overload in place. Any 3-arg call (announcement
-- fan-out trigger, announcement RLS) becomes ambiguous: "function is not unique".

drop policy if exists "Members can view scoped announcements" on public.announcements;
create policy "Members can view scoped announcements"
  on public.announcements for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and public.can_access_team_message(auth.uid(), club_id, team_id, false)
  );

create or replace function public.fanout_announcement_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id)
  select
    new.club_id,
    cm.user_id,
    new.title,
    left(new.content, 240),
    'announcement',
    new.id
  from public.club_memberships cm
  where cm.club_id = new.club_id
    and cm.status = 'active'
    and cm.user_id is distinct from new.author_id
    and public.can_access_team_message(cm.user_id, new.club_id, new.team_id, false);

  return new;
end;
$$;

drop function if exists public.can_access_team_message(uuid, uuid, uuid);
