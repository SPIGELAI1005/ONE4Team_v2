-- Audit trail for club ↔ member relationship (invites, drafts, roster changes, join).

create table if not exists public.club_member_audit_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid references public.club_memberships(id) on delete set null,
  draft_id uuid references public.club_member_drafts(id) on delete set null,
  correlation_email text,
  event_type text not null,
  summary text,
  detail jsonb not null default '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_member_audit_club_membership
  on public.club_member_audit_events (club_id, membership_id);
create index if not exists idx_club_member_audit_club_email
  on public.club_member_audit_events (club_id, correlation_email);
create index if not exists idx_club_member_audit_created
  on public.club_member_audit_events (club_id, created_at desc);

alter table public.club_member_audit_events enable row level security;

drop policy if exists "club_member_audit_events_select_staff" on public.club_member_audit_events;
create policy "club_member_audit_events_select_staff"
  on public.club_member_audit_events for select
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

-- Inserts via triggers (table owner) and append_club_member_audit_event only.

create or replace function public.append_club_member_audit_event(
  _club_id uuid,
  _membership_id uuid,
  _correlation_email text,
  _draft_id uuid,
  _event_type text,
  _summary text,
  _detail jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_club_admin(v_actor, _club_id) then
    raise exception 'Not authorized';
  end if;

  insert into public.club_member_audit_events (
    club_id,
    membership_id,
    correlation_email,
    draft_id,
    event_type,
    summary,
    detail,
    actor_user_id
  )
  values (
    _club_id,
    _membership_id,
    case
      when _correlation_email is not null and length(trim(_correlation_email)) > 0
      then lower(trim(_correlation_email))
      else null
    end,
    _draft_id,
    _event_type,
    nullif(trim(coalesce(_summary, '')), ''),
    coalesce(_detail, '{}'::jsonb),
    v_actor
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_club_member_audit_event(uuid, uuid, text, uuid, text, text, jsonb) from public;
grant execute on function public.append_club_member_audit_event(uuid, uuid, text, uuid, text, text, jsonb) to authenticated;

create or replace function public.get_club_member_audit_timeline(_club_id uuid, _membership_id uuid)
returns table (
  id uuid,
  event_type text,
  summary text,
  detail jsonb,
  actor_user_id uuid,
  created_at timestamptz,
  correlation_email text,
  membership_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not (
    public.is_club_admin(auth.uid(), _club_id)
    or public.is_club_trainer(auth.uid(), _club_id)
  ) then
    raise exception 'Not authorized';
  end if;

  select lower(trim(coalesce(u.email, ''))) into v_email
  from public.club_memberships cm
  join auth.users u on u.id = cm.user_id
  where cm.id = _membership_id
    and cm.club_id = _club_id;

  if v_email is null or v_email = '' then
    return;
  end if;

  return query
  select
    e.id,
    e.event_type,
    e.summary,
    e.detail,
    e.actor_user_id,
    e.created_at,
    e.correlation_email,
    e.membership_id
  from public.club_member_audit_events e
  where e.club_id = _club_id
    and (
      e.membership_id = _membership_id
      or (
        e.correlation_email is not null
        and e.correlation_email = v_email
      )
    )
  order by e.created_at desc
  limit 250;
end;
$$;

revoke all on function public.get_club_member_audit_timeline(uuid, uuid) from public;
grant execute on function public.get_club_member_audit_timeline(uuid, uuid) to authenticated;

-- Server-side roster lifecycle (covers invite redemption and admin edits).
create or replace function public.trg_club_memberships_audit()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_detail jsonb;
begin
  if tg_op = 'INSERT' then
    select lower(trim(coalesce(u.email, ''))) into v_email
    from auth.users u where u.id = new.user_id;

    insert into public.club_member_audit_events (
      club_id, membership_id, correlation_email, event_type, summary, detail, actor_user_id
    ) values (
      new.club_id,
      new.id,
      nullif(v_email, ''),
      'membership_joined',
      'Joined the club',
      jsonb_build_object(
        'role', new.role,
        'status', new.status,
        'team', new.team,
        'age_group', new.age_group,
        'position', new.position
      ),
      auth.uid()
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select lower(trim(coalesce(u.email, ''))) into v_email
    from auth.users u where u.id = new.user_id;

    v_detail := '{}'::jsonb;
    if old.role is distinct from new.role then
      v_detail := v_detail || jsonb_build_object(
        'role', jsonb_build_object('from', old.role, 'to', new.role)
      );
    end if;
    if old.status is distinct from new.status then
      v_detail := v_detail || jsonb_build_object(
        'status', jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;
    if old.team is distinct from new.team then
      v_detail := v_detail || jsonb_build_object(
        'team', jsonb_build_object('from', old.team, 'to', new.team)
      );
    end if;
    if old.age_group is distinct from new.age_group then
      v_detail := v_detail || jsonb_build_object(
        'age_group', jsonb_build_object('from', old.age_group, 'to', new.age_group)
      );
    end if;
    if old.position is distinct from new.position then
      v_detail := v_detail || jsonb_build_object(
        'position', jsonb_build_object('from', old.position, 'to', new.position)
      );
    end if;

    if v_detail = '{}'::jsonb then
      return new;
    end if;

    insert into public.club_member_audit_events (
      club_id, membership_id, correlation_email, event_type, summary, detail, actor_user_id
    ) values (
      new.club_id,
      new.id,
      nullif(v_email, ''),
      'membership_profile_updated',
      'Roster profile updated',
      v_detail,
      auth.uid()
    );
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists club_memberships_audit_iu on public.club_memberships;
create trigger club_memberships_audit_iu
  after insert or update on public.club_memberships
  for each row execute function public.trg_club_memberships_audit();

create or replace function public.trg_club_memberships_audit_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select lower(trim(coalesce(u.email, ''))) into v_email
  from auth.users u where u.id = old.user_id;

  insert into public.club_member_audit_events (
    club_id, membership_id, correlation_email, event_type, summary, detail, actor_user_id
  ) values (
    old.club_id,
    old.id,
    nullif(v_email, ''),
    'membership_removed',
    'Removed from club roster',
    jsonb_build_object('had_role', old.role, 'had_status', old.status),
    auth.uid()
  );
  return old;
end;
$$;

drop trigger if exists club_memberships_audit_d on public.club_memberships;
create trigger club_memberships_audit_d
  before delete on public.club_memberships
  for each row execute function public.trg_club_memberships_audit_delete();
