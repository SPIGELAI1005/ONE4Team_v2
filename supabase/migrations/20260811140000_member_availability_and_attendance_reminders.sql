-- Wave 2 Team Operations: planned availability + attendance reminder log + activity deadline flags.

-- ---------------------------------------------------------------------------
-- 1) Activity RSVP configuration flags
-- ---------------------------------------------------------------------------
alter table public.activities
  add column if not exists response_required boolean not null default false;

alter table public.activities
  add column if not exists automatic_reminders boolean not null default false;

comment on column public.activities.response_required is
  'When true, trainers treat unanswered roster members as requiring a response.';
comment on column public.activities.automatic_reminders is
  'When true, scheduled reminder jobs may notify missing responders (Edge/cron).';

-- ---------------------------------------------------------------------------
-- 2) member_availability (planned leave / availability independent of RSVP)
-- ---------------------------------------------------------------------------
create table if not exists public.member_availability (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'unavailable'
    check (status in ('available', 'unavailable', 'limited')),
  reason text
    check (
      reason is null
      or reason in ('illness', 'injury', 'holiday', 'school', 'family', 'work', 'other')
    ),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_availability_range_check check (ends_at > starts_at)
);

create index if not exists idx_member_availability_club_member
  on public.member_availability (club_id, membership_id);

create index if not exists idx_member_availability_range
  on public.member_availability (club_id, starts_at, ends_at);

drop trigger if exists update_member_availability_updated_at on public.member_availability;
create trigger update_member_availability_updated_at
  before update on public.member_availability
  for each row execute function public.update_updated_at();

alter table public.member_availability enable row level security;

drop policy if exists "member_availability_select_club" on public.member_availability;
create policy "member_availability_select_club"
  on public.member_availability for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

-- Writes go through security-definer RPC; keep direct writes locked down to managers/self for safety.
drop policy if exists "member_availability_insert_self_or_manage" on public.member_availability;
create policy "member_availability_insert_self_or_manage"
  on public.member_availability for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_own_membership(auth.uid(), membership_id)
      or public.is_guardian_for_member(auth.uid(), membership_id)
      or public.shares_login_email_with_membership(auth.uid(), membership_id)
      or public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
    )
  );

drop policy if exists "member_availability_update_self_or_manage" on public.member_availability;
create policy "member_availability_update_self_or_manage"
  on public.member_availability for update to authenticated
  using (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_guardian_for_member(auth.uid(), membership_id)
    or public.shares_login_email_with_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  )
  with check (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_guardian_for_member(auth.uid(), membership_id)
    or public.shares_login_email_with_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

drop policy if exists "member_availability_delete_self_or_manage" on public.member_availability;
create policy "member_availability_delete_self_or_manage"
  on public.member_availability for delete to authenticated
  using (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_guardian_for_member(auth.uid(), membership_id)
    or public.shares_login_email_with_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

-- ---------------------------------------------------------------------------
-- 3) Reminder idempotency log
-- ---------------------------------------------------------------------------
create table if not exists public.activity_attendance_reminder_log (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  reminder_type text not null
    check (reminder_type in ('manual_missing', 'deadline_48h', 'deadline_24h', 'deadline_custom')),
  deadline_key text not null default 'none',
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id) on delete set null,
  unique (activity_id, membership_id, reminder_type, deadline_key)
);

create index if not exists idx_activity_attendance_reminder_activity
  on public.activity_attendance_reminder_log (activity_id, reminder_type);

alter table public.activity_attendance_reminder_log enable row level security;

drop policy if exists "attendance_reminder_log_select_manage" on public.activity_attendance_reminder_log;
create policy "attendance_reminder_log_select_manage"
  on public.activity_attendance_reminder_log for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
    or exists (
      select 1 from public.club_memberships cm
      where cm.user_id = auth.uid()
        and cm.club_id = activity_attendance_reminder_log.club_id
        and cm.status = 'active'
        and cm.role::text = 'team_management'
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Upsert / delete availability RPCs
-- ---------------------------------------------------------------------------
create or replace function public.upsert_member_availability(
  _membership_id uuid,
  _starts_at timestamptz,
  _ends_at timestamptz,
  _status text,
  _reason text default null,
  _note text default null,
  _id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.club_memberships%rowtype;
  v_status text := lower(trim(coalesce(_status, '')));
  v_reason text := nullif(lower(trim(coalesce(_reason, ''))), '');
  v_note text := nullif(trim(coalesce(_note, '')), '');
  v_row public.member_availability%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if _ends_at <= _starts_at then
    return jsonb_build_object('ok', false, 'error', 'invalid_range');
  end if;

  if v_status not in ('available', 'unavailable', 'limited') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if v_reason is not null
     and v_reason not in ('illness', 'injury', 'holiday', 'school', 'family', 'work', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reason');
  end if;

  select * into v_member
  from public.club_memberships
  where id = _membership_id
    and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'membership_not_found');
  end if;

  if not (
    public.is_own_membership(v_uid, _membership_id)
    or public.is_guardian_for_member(v_uid, _membership_id)
    or public.shares_login_email_with_membership(v_uid, _membership_id)
    or public.is_club_admin(v_uid, v_member.club_id)
    or public.is_club_trainer(v_uid, v_member.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if _id is not null then
    update public.member_availability ma
    set
      starts_at = _starts_at,
      ends_at = _ends_at,
      status = v_status,
      reason = v_reason,
      note = v_note,
      updated_at = now()
    where ma.id = _id
      and ma.club_id = v_member.club_id
      and ma.membership_id = _membership_id
    returning * into v_row;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  else
    insert into public.member_availability (
      club_id, membership_id, starts_at, ends_at, status, reason, note, created_by
    )
    values (
      v_member.club_id, _membership_id, _starts_at, _ends_at, v_status, v_reason, v_note, v_uid
    )
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'availability', jsonb_build_object(
      'id', v_row.id,
      'club_id', v_row.club_id,
      'membership_id', v_row.membership_id,
      'starts_at', v_row.starts_at,
      'ends_at', v_row.ends_at,
      'status', v_row.status,
      'reason', v_row.reason,
      'note', v_row.note
    )
  );
end;
$$;

revoke all on function public.upsert_member_availability(uuid, timestamptz, timestamptz, text, text, text, uuid) from public;
grant execute on function public.upsert_member_availability(uuid, timestamptz, timestamptz, text, text, text, uuid) to authenticated;

create or replace function public.delete_member_availability(_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.member_availability%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.member_availability where id = _id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not (
    public.is_own_membership(v_uid, v_row.membership_id)
    or public.is_guardian_for_member(v_uid, v_row.membership_id)
    or public.shares_login_email_with_membership(v_uid, v_row.membership_id)
    or public.is_club_admin(v_uid, v_row.club_id)
    or public.is_club_trainer(v_uid, v_row.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.member_availability where id = _id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_member_availability(uuid) from public;
grant execute on function public.delete_member_availability(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Manual missing-response reminders (in-app notifications)
-- ---------------------------------------------------------------------------
create or replace function public.remind_missing_activity_attendance(
  _activity_id uuid,
  _reminder_type text default 'manual_missing'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.activities%rowtype;
  v_type text := lower(trim(coalesce(_reminder_type, 'manual_missing')));
  v_deadline_key text := 'none';
  v_sent int := 0;
  v_skipped int := 0;
  r record;
  v_title text;
  v_body text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_type not in ('manual_missing', 'deadline_48h', 'deadline_24h', 'deadline_custom') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reminder_type');
  end if;

  select * into v_activity from public.activities where id = _activity_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'activity_not_found');
  end if;

  if not public.can_manage_activity_attendance(v_uid, _activity_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_activity.response_deadline is not null then
    v_deadline_key := to_char(v_activity.response_deadline at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  v_title := 'RSVP reminder: ' || coalesce(v_activity.title, 'Activity');
  v_body := 'Please respond for ' || coalesce(v_activity.title, 'this activity')
    || ' on ' || to_char(v_activity.starts_at at time zone 'utc', 'YYYY-MM-DD HH24:MI') || ' UTC.';

  for r in
    select
      cm.id as membership_id,
      cm.user_id
    from public.club_memberships cm
    where cm.club_id = v_activity.club_id
      and cm.status = 'active'
      and cm.user_id is not null
      and (
        (
          v_activity.team_id is not null
          and exists (
            select 1 from public.team_players tp
            where tp.team_id = v_activity.team_id
              and tp.membership_id = cm.id
          )
        )
        or (
          v_activity.team_id is null
          and cm.role::text in ('player', 'member')
        )
      )
      and not exists (
        select 1
        from public.activity_attendance aa
        where aa.activity_id = _activity_id
          and aa.membership_id = cm.id
          and aa.status in ('confirmed', 'declined', 'attended', 'maybe')
      )
  loop
    begin
      insert into public.activity_attendance_reminder_log (
        club_id, activity_id, membership_id, reminder_type, deadline_key, sent_by
      )
      values (
        v_activity.club_id, _activity_id, r.membership_id, v_type, v_deadline_key, v_uid
      );

      insert into public.notifications (
        club_id, user_id, title, body, notification_type, reference_id
      )
      values (
        v_activity.club_id, r.user_id, v_title, v_body, 'event', _activity_id
      );

      v_sent := v_sent + 1;
    exception
      when unique_violation then
        v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'sent', v_sent,
    'skipped', v_skipped,
    'reminder_type', v_type,
    'deadline_key', v_deadline_key
  );
end;
$$;

revoke all on function public.remind_missing_activity_attendance(uuid, text) from public;
grant execute on function public.remind_missing_activity_attendance(uuid, text) to authenticated;
