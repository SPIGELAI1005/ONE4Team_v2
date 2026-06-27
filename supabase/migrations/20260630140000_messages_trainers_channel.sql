-- Trainers-only club chat channel (team_id null + is_trainers_channel).

alter table public.messages
  add column if not exists is_trainers_channel boolean not null default false;

alter table public.messages
  drop constraint if exists messages_trainers_channel_requires_null_team;

alter table public.messages
  add constraint messages_trainers_channel_requires_null_team
  check (not is_trainers_channel or team_id is null);

create or replace function public.can_access_team_message(
  _user_id uuid,
  _club_id uuid,
  _team_id uuid,
  _is_trainers_channel boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when _is_trainers_channel then
      public.is_club_admin(_user_id, _club_id)
      or public.is_club_trainer(_user_id, _club_id)
      or exists (
        select 1
        from public.club_role_assignments cra
        join public.club_memberships cm on cm.id = cra.membership_id
        where cm.user_id = _user_id
          and cm.club_id = _club_id
          and cm.status = 'active'
          and cra.role_kind = 'team_admin'
      )
    when _team_id is null then true
    else
      public.is_club_admin(_user_id, _club_id)
      or exists (
        select 1
        from public.team_players tp
        join public.club_memberships cm on cm.id = tp.membership_id
        where tp.team_id = _team_id
          and cm.user_id = _user_id
          and cm.club_id = _club_id
          and cm.status = 'active'
      )
  end;
$$;

grant execute on function public.can_access_team_message(uuid, uuid, uuid, boolean) to authenticated;

drop policy if exists "Members can view scoped messages" on public.messages;
drop policy if exists "Members can send scoped messages" on public.messages;

create policy "Members can view scoped messages"
  on public.messages for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and public.can_access_team_message(auth.uid(), club_id, team_id, is_trainers_channel)
  );

create policy "Members can send scoped messages"
  on public.messages for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and sender_id = auth.uid()
    and public.can_access_team_message(auth.uid(), club_id, team_id, is_trainers_channel)
  );

create or replace function public.fanout_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if new.is_trainers_channel then
    v_title := 'Trainers';
  elsif new.team_id is null then
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
    and public.can_access_team_message(cm.user_id, new.club_id, new.team_id, new.is_trainers_channel);

  return new;
end;
$$;
