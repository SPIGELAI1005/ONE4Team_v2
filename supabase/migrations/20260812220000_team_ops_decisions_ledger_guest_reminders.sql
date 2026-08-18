-- Team Ops product decisions (Prompt 17 follow-through):
-- ledger approvals, guest convert (A+B), reminder types + custom_reminder_at + cron helper.

-- ---------------------------------------------------------------------------
-- 1) Activities: custom reminder timestamp
-- ---------------------------------------------------------------------------
alter table public.activities
  add column if not exists custom_reminder_at timestamptz;

comment on column public.activities.custom_reminder_at is
  'Optional custom RSVP reminder fire time when automatic_reminders is true.';

-- ---------------------------------------------------------------------------
-- 2) Reminder log: allow morning_of (+ keep existing types)
-- ---------------------------------------------------------------------------
alter table public.activity_attendance_reminder_log
  drop constraint if exists activity_attendance_reminder_log_reminder_type_check;

alter table public.activity_attendance_reminder_log
  add constraint activity_attendance_reminder_log_reminder_type_check
  check (reminder_type in (
    'manual_missing',
    'deadline_48h',
    'deadline_24h',
    'deadline_custom',
    'morning_of',
    'starts_24h'
  ));

-- ---------------------------------------------------------------------------
-- 3) Cron-safe missing RSVP remind (service role) + email payload return
-- ---------------------------------------------------------------------------
create or replace function public.remind_missing_activity_attendance_service(
  _activity_id uuid,
  _reminder_type text default 'deadline_24h'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_activity public.activities%rowtype;
  v_type text := lower(trim(coalesce(_reminder_type, 'deadline_24h')));
  v_deadline_key text := 'none';
  v_sent int := 0;
  v_skipped int := 0;
  r record;
  v_title text;
  v_body text;
  v_recipients jsonb := '[]'::jsonb;
begin
  if v_type not in (
    'manual_missing', 'deadline_48h', 'deadline_24h', 'deadline_custom',
    'morning_of', 'starts_24h'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_reminder_type');
  end if;

  select * into v_activity from public.activities where id = _activity_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'activity_not_found');
  end if;

  if not coalesce(v_activity.automatic_reminders, false) and v_type <> 'manual_missing' then
    return jsonb_build_object('ok', false, 'error', 'automatic_reminders_off');
  end if;

  if v_activity.response_deadline is not null then
    v_deadline_key := to_char(v_activity.response_deadline at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  elsif v_type = 'morning_of' then
    v_deadline_key := to_char(v_activity.starts_at at time zone 'utc', 'YYYY-MM-DD');
  elsif v_type = 'starts_24h' then
    v_deadline_key := to_char(v_activity.starts_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  elsif v_type = 'deadline_custom' and v_activity.custom_reminder_at is not null then
    v_deadline_key := to_char(v_activity.custom_reminder_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  v_title := 'RSVP reminder: ' || coalesce(v_activity.title, 'Activity');
  v_body := 'Please respond for ' || coalesce(v_activity.title, 'this activity')
    || ' on ' || to_char(v_activity.starts_at at time zone 'utc', 'YYYY-MM-DD HH24:MI') || ' UTC.';

  for r in
    select
      cm.id as membership_id,
      cm.user_id,
      coalesce(nullif(trim(p.email), ''), '') as email,
      coalesce(nullif(trim(p.display_name), ''), cm.id::text) as display_name
    from public.club_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
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
        v_activity.club_id, _activity_id, r.membership_id, v_type, v_deadline_key, null
      );

      insert into public.notifications (
        club_id, user_id, title, body, notification_type, reference_id
      )
      values (
        v_activity.club_id, r.user_id, v_title, v_body, 'event', _activity_id
      );

      v_recipients := v_recipients || jsonb_build_array(
        jsonb_build_object(
          'membership_id', r.membership_id,
          'user_id', r.user_id,
          'email', r.email,
          'display_name', r.display_name
        )
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
    'deadline_key', v_deadline_key,
    'activity_id', _activity_id,
    'club_id', v_activity.club_id,
    'activity_title', v_activity.title,
    'starts_at', v_activity.starts_at,
    'recipients', v_recipients
  );
end;
$$;

-- Also accept morning_of / starts_24h on trainer manual RPC
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
  v_type text := lower(trim(coalesce(_reminder_type, 'manual_missing')));
  v_result jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_type not in (
    'manual_missing', 'deadline_48h', 'deadline_24h', 'deadline_custom',
    'morning_of', 'starts_24h'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_reminder_type');
  end if;

  if not public.can_manage_activity_attendance(v_uid, _activity_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Temporarily allow manual even if automatic_reminders is false
  select * into v_result from public.remind_missing_activity_attendance_service(_activity_id, v_type);
  return v_result;
end;
$$;

revoke all on function public.remind_missing_activity_attendance_service(uuid, text) from public;
grant execute on function public.remind_missing_activity_attendance_service(uuid, text) to service_role;

revoke all on function public.remind_missing_activity_attendance(uuid, text) from public;
grant execute on function public.remind_missing_activity_attendance(uuid, text) to authenticated;

-- List due activities for cron (service role)
create or replace function public.list_activities_due_for_attendance_reminders(
  _now timestamptz default now()
)
returns table (
  activity_id uuid,
  club_id uuid,
  reminder_type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select a.id, a.club_id, 'deadline_24h'::text
  from public.activities a
  where coalesce(a.automatic_reminders, false)
    and a.response_deadline is not null
    and a.response_deadline > _now
    and a.response_deadline <= _now + interval '24 hours'
  union all
  select a.id, a.club_id, 'starts_24h'::text
  from public.activities a
  where coalesce(a.automatic_reminders, false)
    and a.starts_at > _now
    and a.starts_at <= _now + interval '24 hours'
    and (a.response_deadline is null or a.response_deadline > _now + interval '24 hours')
  union all
  select a.id, a.club_id, 'morning_of'::text
  from public.activities a
  where coalesce(a.automatic_reminders, false)
    and (a.starts_at at time zone 'utc')::date = (_now at time zone 'utc')::date
    and a.starts_at > _now
  union all
  select a.id, a.club_id, 'deadline_custom'::text
  from public.activities a
  where coalesce(a.automatic_reminders, false)
    and a.custom_reminder_at is not null
    and a.custom_reminder_at > _now - interval '30 minutes'
    and a.custom_reminder_at <= _now + interval '30 minutes';
end;
$$;

revoke all on function public.list_activities_due_for_attendance_reminders(timestamptz) from public;
grant execute on function public.list_activities_due_for_attendance_reminders(timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Guest conversion A+B
-- ---------------------------------------------------------------------------
alter table public.activity_guest_participants
  add column if not exists converted_draft_id uuid references public.club_member_drafts(id) on delete set null;

create or replace function public.convert_activity_guest(
  _guest_id uuid,
  _mode text,
  _membership_id uuid default null,
  _draft_role text default 'player'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest public.activity_guest_participants%rowtype;
  v_draft_id uuid;
  v_email text;
  v_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_guest from public.activity_guest_participants where id = _guest_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not (
    public.is_club_admin(v_uid, v_guest.club_id)
    or public.is_club_trainer(v_uid, v_guest.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_guest.converted_membership_id is not null or v_guest.converted_draft_id is not null then
    return jsonb_build_object('ok', false, 'error', 'already_converted');
  end if;

  if _mode = 'link' then
    if _membership_id is null then
      return jsonb_build_object('ok', false, 'error', 'membership_required');
    end if;
    if not exists (
      select 1 from public.club_memberships cm
      where cm.id = _membership_id and cm.club_id = v_guest.club_id and cm.status = 'active'
    ) then
      return jsonb_build_object('ok', false, 'error', 'membership_not_found');
    end if;

    update public.activity_guest_participants
    set converted_membership_id = _membership_id, status = 'confirmed', updated_at = now()
    where id = v_guest.id;

    return jsonb_build_object('ok', true, 'mode', 'link', 'membership_id', _membership_id);
  end if;

  if _mode = 'draft' then
    v_email := nullif(trim(coalesce(v_guest.contact_email, '')), '');
    v_name := nullif(trim(coalesce(v_guest.display_name, '')), '');
    if v_email is null then
      return jsonb_build_object('ok', false, 'error', 'email_required');
    end if;

    insert into public.club_member_drafts (
      club_id, name, email, role, status, created_by
    ) values (
      v_guest.club_id,
      coalesce(v_name, v_email),
      lower(v_email),
      coalesce(nullif(trim(_draft_role), ''), 'player'),
      'draft',
      v_uid
    )
    returning id into v_draft_id;

    update public.activity_guest_participants
    set converted_draft_id = v_draft_id, updated_at = now()
    where id = v_guest.id;

    return jsonb_build_object(
      'ok', true,
      'mode', 'draft',
      'draft_id', v_draft_id,
      'email', lower(v_email),
      'name', coalesce(v_name, v_email)
    );
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_mode');
end;
$$;

revoke all on function public.convert_activity_guest(uuid, text, uuid, text) from public;
grant execute on function public.convert_activity_guest(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Team ledger approvals (all entries; reject → edit/resubmit)
-- ---------------------------------------------------------------------------
alter table public.team_ledger_entries
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

alter table public.team_ledger_entries
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

alter table public.team_ledger_entries
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.team_ledger_entries
  add column if not exists reviewed_at timestamptz;

alter table public.team_ledger_entries
  add column if not exists rejection_reason text;

-- Backfill historical cashbox rows as approved
update public.team_ledger_entries
set status = 'approved',
    submitted_by = coalesce(submitted_by, created_by),
    reviewed_at = coalesce(reviewed_at, created_at)
where status = 'pending';

create or replace function public.post_team_ledger_entry(
  _team_id uuid,
  _direction text,
  _amount numeric,
  _category text default 'other',
  _description text default null,
  _entry_date date default current_date,
  _membership_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_account_id uuid;
  v_entry_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if _direction not in ('in', 'out') then
    return jsonb_build_object('ok', false, 'error', 'invalid_direction');
  end if;

  if _amount is null or _amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  if _category is null or _category not in (
    'contribution', 'kit', 'travel', 'equipment', 'event', 'refund', 'other'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_category');
  end if;

  select * into v_team from public.teams where id = _team_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'team_not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_team.club_id, v_team.id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_account_id from public.team_ledger_accounts where team_id = v_team.id;
  if v_account_id is null then
    insert into public.team_ledger_accounts (club_id, team_id, created_by)
    values (v_team.club_id, v_team.id, v_uid)
    returning id into v_account_id;
  end if;

  insert into public.team_ledger_entries (
    club_id, team_id, account_id, entry_date, direction, amount,
    category, description, membership_id, created_by, submitted_by, status
  ) values (
    v_team.club_id, v_team.id, v_account_id, coalesce(_entry_date, current_date),
    _direction, round(_amount, 2), _category,
    nullif(trim(coalesce(_description, '')), ''),
    _membership_id, v_uid, v_uid, 'pending'
  )
  returning id into v_entry_id;

  return jsonb_build_object(
    'ok', true,
    'entry_id', v_entry_id,
    'account_id', v_account_id,
    'status', 'pending'
  );
end;
$$;

create or replace function public.approve_team_ledger_entry(_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.team_ledger_entries%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.team_ledger_entries where id = _entry_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_row.club_id, v_row.team_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  if v_row.submitted_by is not null and v_row.submitted_by = v_uid then
    return jsonb_build_object('ok', false, 'error', 'cannot_self_approve');
  end if;

  update public.team_ledger_entries
  set status = 'approved',
      reviewed_by = v_uid,
      reviewed_at = now(),
      rejection_reason = null,
      updated_at = now()
  where id = v_row.id;

  return jsonb_build_object('ok', true, 'entry_id', v_row.id, 'status', 'approved');
end;
$$;

create or replace function public.reject_team_ledger_entry(_entry_id uuid, _reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.team_ledger_entries%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.team_ledger_entries where id = _entry_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_row.club_id, v_row.team_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  if v_row.submitted_by is not null and v_row.submitted_by = v_uid then
    return jsonb_build_object('ok', false, 'error', 'cannot_self_reject');
  end if;

  update public.team_ledger_entries
  set status = 'rejected',
      reviewed_by = v_uid,
      reviewed_at = now(),
      rejection_reason = nullif(trim(coalesce(_reason, '')), ''),
      updated_at = now()
  where id = v_row.id;

  return jsonb_build_object('ok', true, 'entry_id', v_row.id, 'status', 'rejected');
end;
$$;

create or replace function public.resubmit_team_ledger_entry(
  _entry_id uuid,
  _direction text default null,
  _amount numeric default null,
  _category text default null,
  _description text default null,
  _entry_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.team_ledger_entries%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.team_ledger_entries where id = _entry_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_row.club_id, v_row.team_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_row.status <> 'rejected' then
    return jsonb_build_object('ok', false, 'error', 'not_rejected');
  end if;

  if v_row.submitted_by is not null and v_row.submitted_by <> v_uid and not public.is_club_admin(v_uid, v_row.club_id) then
    return jsonb_build_object('ok', false, 'error', 'only_submitter');
  end if;

  update public.team_ledger_entries
  set
    direction = coalesce(_direction, direction),
    amount = coalesce(round(_amount, 2), amount),
    category = coalesce(_category, category),
    description = case when _description is null then description else nullif(trim(_description), '') end,
    entry_date = coalesce(_entry_date, entry_date),
    status = 'pending',
    submitted_by = v_uid,
    reviewed_by = null,
    reviewed_at = null,
    rejection_reason = null,
    updated_at = now()
  where id = v_row.id;

  return jsonb_build_object('ok', true, 'entry_id', v_row.id, 'status', 'pending');
end;
$$;

create or replace function public.team_ledger_balance(_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_in numeric;
  v_out numeric;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_team from public.teams where id = _team_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'team_not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_team.club_id, v_team.id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select
    coalesce(sum(case when direction = 'in' then amount else 0 end), 0),
    coalesce(sum(case when direction = 'out' then amount else 0 end), 0)
  into v_in, v_out
  from public.team_ledger_entries
  where team_id = v_team.id
    and status = 'approved';

  return jsonb_build_object(
    'ok', true,
    'currency', coalesce(
      (select currency from public.team_ledger_accounts where team_id = v_team.id limit 1),
      'EUR'
    ),
    'total_in', v_in,
    'total_out', v_out,
    'balance', v_in - v_out
  );
end;
$$;

revoke all on function public.approve_team_ledger_entry(uuid) from public;
grant execute on function public.approve_team_ledger_entry(uuid) to authenticated;
revoke all on function public.reject_team_ledger_entry(uuid, text) from public;
grant execute on function public.reject_team_ledger_entry(uuid, text) to authenticated;
revoke all on function public.resubmit_team_ledger_entry(uuid, text, numeric, text, text, date) from public;
grant execute on function public.resubmit_team_ledger_entry(uuid, text, numeric, text, text, date) to authenticated;
