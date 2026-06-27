-- Team-scoped club messages + automatic notification fan-out for announcements and chat.

create or replace function public.can_access_team_message(
  _user_id uuid,
  _club_id uuid,
  _team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _team_id is null
    or public.is_club_admin(_user_id, _club_id)
    or exists (
      select 1
      from public.team_players tp
      join public.club_memberships cm on cm.id = tp.membership_id
      where tp.team_id = _team_id
        and cm.user_id = _user_id
        and cm.club_id = _club_id
        and cm.status = 'active'
    );
$$;

grant execute on function public.can_access_team_message(uuid, uuid, uuid) to authenticated;

-- Messages: club-general (team_id null) for all members; team channels for roster + admins.
drop policy if exists "Members can view messages" on public.messages;
drop policy if exists "Members can send messages" on public.messages;

create policy "Members can view scoped messages"
  on public.messages for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and public.can_access_team_message(auth.uid(), club_id, team_id)
  );

create policy "Members can send scoped messages"
  on public.messages for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and sender_id = auth.uid()
    and public.can_access_team_message(auth.uid(), club_id, team_id)
  );

-- Announcements: same team scoping for read access.
drop policy if exists "Members can view announcements" on public.announcements;

create policy "Members can view scoped announcements"
  on public.announcements for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and public.can_access_team_message(auth.uid(), club_id, team_id)
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
    and public.can_access_team_message(cm.user_id, new.club_id, new.team_id);

  return new;
end;
$$;

drop trigger if exists trg_fanout_announcement_notifications on public.announcements;
create trigger trg_fanout_announcement_notifications
  after insert on public.announcements
  for each row
  execute function public.fanout_announcement_notifications();

create or replace function public.fanout_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if new.team_id is null then
    v_title := 'Club General';
  else
    select coalesce(t.name, 'Team') into v_title
    from public.teams t
    where t.id = new.team_id;
  end if;

  insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id)
  select
    new.club_id,
    cm.user_id,
    v_title,
    left(new.content, 240),
    'message',
    new.id
  from public.club_memberships cm
  where cm.club_id = new.club_id
    and cm.status = 'active'
    and cm.user_id is distinct from new.sender_id
    and public.can_access_team_message(cm.user_id, new.club_id, new.team_id);

  return new;
end;
$$;

drop trigger if exists trg_fanout_message_notifications on public.messages;
create trigger trg_fanout_message_notifications
  after insert on public.messages
  for each row
  execute function public.fanout_message_notifications();
