-- Wave 1 Team Operations: strengthen activity_attendance + privileged RSVP RPC.
-- Extends statuses (maybe), actor metadata, typed decline reasons, optional activity deadline.
-- Guardian / household / trainer writes go through security-definer RPC (not open RLS).

-- ---------------------------------------------------------------------------
-- 1) activities.response_deadline (optional per-activity RSVP close)
-- ---------------------------------------------------------------------------
alter table public.activities
  add column if not exists response_deadline timestamptz;

comment on column public.activities.response_deadline is
  'Optional RSVP close time. When null, client/RPC may apply type-specific defaults (e.g. 1h before training).';

-- ---------------------------------------------------------------------------
-- 2) activity_attendance columns + maybe status
-- ---------------------------------------------------------------------------
alter table public.activity_attendance
  add column if not exists response_reason text;

alter table public.activity_attendance
  add column if not exists responded_by uuid references auth.users(id) on delete set null;

alter table public.activity_attendance
  add column if not exists responded_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'activity_attendance_status_check'
      and conrelid = 'public.activity_attendance'::regclass
  ) then
    alter table public.activity_attendance drop constraint activity_attendance_status_check;
  end if;
exception
  when undefined_table then null;
end $$;

-- Drop any anonymous check on status that still excludes maybe.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.activity_attendance'::regclass
      and c.contype = 'c'
      and a.attname = 'status'
  loop
    execute format('alter table public.activity_attendance drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.activity_attendance
  add constraint activity_attendance_status_check
  check (status in ('invited', 'confirmed', 'declined', 'attended', 'maybe'));

alter table public.activity_attendance
  drop constraint if exists activity_attendance_response_reason_check;

alter table public.activity_attendance
  add constraint activity_attendance_response_reason_check
  check (
    response_reason is null
    or response_reason in ('illness', 'injury', 'holiday', 'school', 'family', 'work', 'other')
  );

create index if not exists idx_activity_attendance_responded_by
  on public.activity_attendance (responded_by)
  where responded_by is not null;

-- ---------------------------------------------------------------------------
-- 3) Helper: can actor manage attendance for an activity (trainer/admin/ops)
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_activity_attendance(_user_id uuid, _activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.activities a
    where a.id = _activity_id
      and (
        public.is_club_admin(_user_id, a.club_id)
        or public.is_club_trainer(_user_id, a.club_id)
        or exists (
          select 1
          from public.club_memberships cm
          where cm.user_id = _user_id
            and cm.club_id = a.club_id
            and cm.status = 'active'
            and cm.role::text = 'team_management'
        )
        or (
          a.team_id is not null
          and public.is_trainer_for_team(_user_id, a.team_id)
        )
      )
  );
$$;

revoke all on function public.can_manage_activity_attendance(uuid, uuid) from public;
grant execute on function public.can_manage_activity_attendance(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Privileged upsert: self / guardian / household / manager
-- ---------------------------------------------------------------------------
create or replace function public.upsert_activity_attendance_response(
  _activity_id uuid,
  _membership_id uuid,
  _status text,
  _notes text default null,
  _response_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.activities%rowtype;
  v_member public.club_memberships%rowtype;
  v_status text := lower(trim(coalesce(_status, '')));
  v_reason text := nullif(lower(trim(coalesce(_response_reason, ''))), '');
  v_notes text := nullif(trim(coalesce(_notes, '')), '');
  v_can_manage boolean := false;
  v_can_respond_for_member boolean := false;
  v_deadline timestamptz;
  v_row public.activity_attendance%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_status not in ('confirmed', 'declined', 'maybe', 'attended', 'invited') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if v_reason is not null
     and v_reason not in ('illness', 'injury', 'holiday', 'school', 'family', 'work', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_response_reason');
  end if;

  select * into v_activity
  from public.activities
  where id = _activity_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'activity_not_found');
  end if;

  select * into v_member
  from public.club_memberships
  where id = _membership_id
    and club_id = v_activity.club_id
    and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'membership_not_found');
  end if;

  v_can_manage := public.can_manage_activity_attendance(v_uid, _activity_id);
  v_can_respond_for_member :=
    public.is_own_membership(v_uid, _membership_id)
    or public.is_guardian_for_member(v_uid, _membership_id)
    or public.shares_login_email_with_membership(v_uid, _membership_id);

  if not v_can_manage and not v_can_respond_for_member then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Non-managers may not set attended/invited operational flags.
  if not v_can_manage and v_status in ('attended', 'invited') then
    return jsonb_build_object('ok', false, 'error', 'status_not_allowed');
  end if;

  -- Enforce response window for self/guardian responses (managers may override).
  if not v_can_manage then
    v_deadline := v_activity.response_deadline;
    if v_deadline is null and v_activity.type = 'training' then
      v_deadline := v_activity.starts_at - interval '1 hour';
    end if;
    if v_deadline is not null and now() >= v_deadline then
      return jsonb_build_object('ok', false, 'error', 'rsvp_closed');
    end if;
  end if;

  if v_status = 'declined' and v_notes is null and v_reason is null then
    return jsonb_build_object('ok', false, 'error', 'decline_reason_required');
  end if;

  if v_status <> 'declined' then
    v_notes := null;
    v_reason := null;
  end if;

  insert into public.activity_attendance as aa (
    club_id,
    activity_id,
    membership_id,
    status,
    notes,
    response_reason,
    responded_by,
    responded_at,
    updated_at
  )
  values (
    v_activity.club_id,
    _activity_id,
    _membership_id,
    v_status,
    v_notes,
    v_reason,
    v_uid,
    now(),
    now()
  )
  on conflict (activity_id, membership_id) do update
  set
    status = excluded.status,
    notes = excluded.notes,
    response_reason = excluded.response_reason,
    responded_by = excluded.responded_by,
    responded_at = excluded.responded_at,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'attendance', jsonb_build_object(
      'id', v_row.id,
      'club_id', v_row.club_id,
      'activity_id', v_row.activity_id,
      'membership_id', v_row.membership_id,
      'status', v_row.status,
      'notes', v_row.notes,
      'response_reason', v_row.response_reason,
      'responded_by', v_row.responded_by,
      'responded_at', v_row.responded_at,
      'updated_at', v_row.updated_at
    )
  );
end;
$$;

revoke all on function public.upsert_activity_attendance_response(uuid, uuid, text, text, text) from public;
grant execute on function public.upsert_activity_attendance_response(uuid, uuid, text, text, text) to authenticated;
