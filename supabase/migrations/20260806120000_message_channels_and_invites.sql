-- Custom message channels + membership invites for system and custom channels.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.message_channels (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists message_channels_club_id_idx
  on public.message_channels (club_id);

create table if not exists public.message_channel_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  membership_id uuid not null references public.club_memberships (id) on delete cascade,
  custom_channel_id uuid references public.message_channels (id) on delete cascade,
  system_channel_key text,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint message_channel_members_target_chk check (
    (custom_channel_id is not null and system_channel_key is null)
    or (custom_channel_id is null and system_channel_key is not null)
  ),
  constraint message_channel_members_system_key_chk check (
    system_channel_key is null
    or system_channel_key in ('announcements', 'club-general', 'trainers')
    or system_channel_key ~ '^team:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

create unique index if not exists message_channel_members_custom_unique
  on public.message_channel_members (custom_channel_id, membership_id)
  where custom_channel_id is not null;

create unique index if not exists message_channel_members_system_unique
  on public.message_channel_members (club_id, system_channel_key, membership_id)
  where system_channel_key is not null;

create index if not exists message_channel_members_membership_idx
  on public.message_channel_members (membership_id);

create index if not exists message_channel_members_club_system_idx
  on public.message_channel_members (club_id, system_channel_key)
  where system_channel_key is not null;

alter table public.messages
  add column if not exists custom_channel_id uuid references public.message_channels (id) on delete cascade;

create index if not exists messages_custom_channel_id_idx
  on public.messages (custom_channel_id)
  where custom_channel_id is not null;

-- Custom-channel messages are club-wide rows (team_id null, not trainers).
alter table public.messages
  drop constraint if exists messages_custom_channel_scope_chk;

alter table public.messages
  add constraint messages_custom_channel_scope_chk check (
    custom_channel_id is null
    or (team_id is null and coalesce(is_trainers_channel, false) = false)
  );

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.message_system_channel_key(
  _team_id uuid,
  _is_trainers_channel boolean
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(_is_trainers_channel, false) then 'trainers'
    when _team_id is null then 'club-general'
    else 'team:' || _team_id::text
  end;
$$;

create or replace function public.has_system_channel_invite(
  _user_id uuid,
  _club_id uuid,
  _system_channel_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_channel_members mcm
    join public.club_memberships cm on cm.id = mcm.membership_id
    where mcm.club_id = _club_id
      and mcm.system_channel_key = _system_channel_key
      and cm.user_id = _user_id
      and cm.club_id = _club_id
      and cm.status = 'active'
  );
$$;

create or replace function public.has_custom_channel_membership(
  _user_id uuid,
  _custom_channel_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_channel_members mcm
    join public.club_memberships cm on cm.id = mcm.membership_id
    where mcm.custom_channel_id = _custom_channel_id
      and cm.user_id = _user_id
      and cm.status = 'active'
  );
$$;

create or replace function public.can_access_team_message(
  _user_id uuid,
  _club_id uuid,
  _team_id uuid,
  _is_trainers_channel boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
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
    end
    or public.has_system_channel_invite(
      _user_id,
      _club_id,
      public.message_system_channel_key(_team_id, _is_trainers_channel)
    );
$$;

create or replace function public.can_access_message_row(
  _user_id uuid,
  _club_id uuid,
  _team_id uuid,
  _is_trainers_channel boolean,
  _custom_channel_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when _custom_channel_id is not null then
      public.has_custom_channel_membership(_user_id, _custom_channel_id)
    else
      public.can_access_team_message(_user_id, _club_id, _team_id, _is_trainers_channel)
  end;
$$;

create or replace function public.can_invite_to_system_channel(
  _user_id uuid,
  _club_id uuid,
  _system_channel_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if not public.is_member_of_club(_user_id, _club_id) then
    return false;
  end if;

  if _system_channel_key = 'announcements' then
    -- Anyone who can open club messages can invite to announcements.
    return true;
  end if;

  if _system_channel_key = 'club-general' then
    return public.can_access_team_message(_user_id, _club_id, null, false);
  end if;

  if _system_channel_key = 'trainers' then
    return public.can_access_team_message(_user_id, _club_id, null, true);
  end if;

  if _system_channel_key like 'team:%' then
    begin
      v_team_id := substring(_system_channel_key from 6)::uuid;
    exception when others then
      return false;
    end;
    return public.can_access_team_message(_user_id, _club_id, v_team_id, false);
  end if;

  return false;
end;
$$;

grant execute on function public.message_system_channel_key(uuid, boolean) to authenticated;
grant execute on function public.has_system_channel_invite(uuid, uuid, text) to authenticated;
grant execute on function public.has_custom_channel_membership(uuid, uuid) to authenticated;
grant execute on function public.can_access_team_message(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.can_access_message_row(uuid, uuid, uuid, boolean, uuid) to authenticated;
grant execute on function public.can_invite_to_system_channel(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: message_channels
-- ---------------------------------------------------------------------------

alter table public.message_channels enable row level security;

drop policy if exists "Members can view their message channels" on public.message_channels;
create policy "Members can view their message channels"
  on public.message_channels for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.has_custom_channel_membership(auth.uid(), id)
    )
  );

drop policy if exists "Members can create message channels" on public.message_channels;
create policy "Members can create message channels"
  on public.message_channels for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and created_by = auth.uid()
  );

drop policy if exists "Owners and admins can update message channels" on public.message_channels;
create policy "Owners and admins can update message channels"
  on public.message_channels for update to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or exists (
      select 1
      from public.message_channel_members mcm
      join public.club_memberships cm on cm.id = mcm.membership_id
      where mcm.custom_channel_id = message_channels.id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and mcm.role = 'owner'
    )
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or exists (
      select 1
      from public.message_channel_members mcm
      join public.club_memberships cm on cm.id = mcm.membership_id
      where mcm.custom_channel_id = message_channels.id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and mcm.role = 'owner'
    )
  );

drop policy if exists "Owners and admins can delete message channels" on public.message_channels;
create policy "Owners and admins can delete message channels"
  on public.message_channels for delete to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or created_by = auth.uid()
    or exists (
      select 1
      from public.message_channel_members mcm
      join public.club_memberships cm on cm.id = mcm.membership_id
      where mcm.custom_channel_id = message_channels.id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and mcm.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: message_channel_members
-- ---------------------------------------------------------------------------

alter table public.message_channel_members enable row level security;

drop policy if exists "Members can view channel memberships" on public.message_channel_members;
create policy "Members can view channel memberships"
  on public.message_channel_members for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or exists (
        select 1
        from public.club_memberships cm
        where cm.id = message_channel_members.membership_id
          and cm.user_id = auth.uid()
      )
      or (
        custom_channel_id is not null
        and public.has_custom_channel_membership(auth.uid(), custom_channel_id)
      )
      or (
        system_channel_key is not null
        and public.can_invite_to_system_channel(auth.uid(), club_id, system_channel_key)
      )
    )
  );

drop policy if exists "Members can invite to message channels" on public.message_channel_members;
create policy "Members can invite to message channels"
  on public.message_channel_members for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and invited_by = auth.uid()
    and exists (
      select 1
      from public.club_memberships cm
      where cm.id = membership_id
        and cm.club_id = club_id
        and cm.status = 'active'
    )
    and (
      (
        custom_channel_id is not null
        and exists (
          select 1
          from public.message_channels mc
          where mc.id = custom_channel_id
            and mc.club_id = club_id
            and (
              mc.created_by = auth.uid()
              or public.has_custom_channel_membership(auth.uid(), custom_channel_id)
            )
        )
      )
      or (
        system_channel_key is not null
        and public.can_invite_to_system_channel(auth.uid(), club_id, system_channel_key)
      )
    )
  );

drop policy if exists "Owners and admins can remove channel memberships" on public.message_channel_members;
create policy "Owners and admins can remove channel memberships"
  on public.message_channel_members for delete to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.id = message_channel_members.membership_id
        and cm.user_id = auth.uid()
    )
    or (
      custom_channel_id is not null
      and exists (
        select 1
        from public.message_channel_members mcm
        join public.club_memberships cm on cm.id = mcm.membership_id
        where mcm.custom_channel_id = message_channel_members.custom_channel_id
          and cm.user_id = auth.uid()
          and cm.status = 'active'
          and mcm.role = 'owner'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Messages / announcements policies
-- ---------------------------------------------------------------------------

drop policy if exists "Members can view scoped messages" on public.messages;
create policy "Members can view scoped messages"
  on public.messages for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and public.can_access_message_row(
      auth.uid(),
      club_id,
      team_id,
      is_trainers_channel,
      custom_channel_id
    )
  );

drop policy if exists "Members can send scoped messages" on public.messages;
create policy "Members can send scoped messages"
  on public.messages for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and sender_id = auth.uid()
    and public.can_access_message_row(
      auth.uid(),
      club_id,
      team_id,
      is_trainers_channel,
      custom_channel_id
    )
  );

drop policy if exists "Members can view scoped announcements" on public.announcements;
create policy "Members can view scoped announcements"
  on public.announcements for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.can_access_team_message(auth.uid(), club_id, team_id, false)
      or (
        team_id is null
        and public.has_system_channel_invite(auth.uid(), club_id, 'announcements')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Notification fan-out
-- ---------------------------------------------------------------------------

create or replace function public.fanout_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if new.custom_channel_id is not null then
    select coalesce(mc.name, 'Channel') into v_title
    from public.message_channels mc
    where mc.id = new.custom_channel_id;

    insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id)
    select
      new.club_id,
      cm.user_id,
      v_title,
      left(new.content, 240),
      'message',
      new.id
    from public.message_channel_members mcm
    join public.club_memberships cm on cm.id = mcm.membership_id
    where mcm.custom_channel_id = new.custom_channel_id
      and cm.status = 'active'
      and cm.user_id is distinct from new.sender_id;

    return new;
  end if;

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
    and (
      public.can_access_team_message(cm.user_id, new.club_id, new.team_id, false)
      or (
        new.team_id is null
        and public.has_system_channel_invite(cm.user_id, new.club_id, 'announcements')
      )
    );

  return new;
end;
$$;

notify pgrst, 'reload schema';
