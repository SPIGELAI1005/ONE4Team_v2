-- Post-review hardening:
-- 1) family-scoped member reads/search,
-- 2) guardian role trigger helper is no longer client-callable,
-- 3) calendar scope authorization,
-- 4) atomic attendance capacity enforcement,
-- 5) reminder preference enforcement.

-- ---------------------------------------------------------------------------
-- Family Members: parents may read their own membership and linked wards.
-- ---------------------------------------------------------------------------
drop policy if exists "Guardians can view linked ward memberships" on public.club_memberships;
create policy "Guardians can view linked ward memberships"
  on public.club_memberships for select to authenticated
  using (public.is_guardian_for_member(auth.uid(), id));

-- Keep the existing staff search behavior, but constrain non-staff callers to
-- their own membership and linked wards. This function is SECURITY DEFINER, so
-- the family predicate must be inside the function rather than client-side.
create or replace function public.search_club_members_page(
  _club_id uuid,
  _search text,
  _role_filter text default null,
  _limit int default 100,
  _offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := trim(coalesce(_search, ''));
  lim int := greatest(1, least(coalesce(_limit, 100), 500));
  off int := greatest(0, coalesce(_offset, 0));
  v_uid uuid := auth.uid();
  v_full_roster boolean := false;
  total bigint;
  items jsonb;
begin
  if v_uid is null or not public.is_member_of_club(v_uid, _club_id) then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  if length(q) < 2 then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  v_full_roster :=
    public.can_manage_club_members(v_uid, _club_id)
    or public.is_club_trainer(v_uid, _club_id);

  select count(*)::bigint into total
  from public.club_memberships cm
  inner join public.profiles p on p.user_id = cm.user_id
  left join public.club_member_master_records m on m.membership_id = cm.id
  where cm.club_id = _club_id
    and (
      v_full_roster
      or cm.user_id = v_uid
      or public.is_guardian_for_member(v_uid, cm.id)
    )
    and (
      _role_filter is null
      or trim(_role_filter) = ''
      or lower(trim(_role_filter)) = 'all'
      or cm.role::text = trim(_role_filter)
    )
    and (
      coalesce(p.display_name, '') ilike ('%' || q || '%')
      or coalesce(p.phone, '') ilike ('%' || q || '%')
      or coalesce(m.first_name, '') ilike ('%' || q || '%')
      or coalesce(m.last_name, '') ilike ('%' || q || '%')
      or coalesce(m.internal_club_number, '') ilike ('%' || q || '%')
    );

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into items
  from (
    select
      cm.id,
      cm.club_id,
      cm.user_id,
      cm.role,
      cm.position,
      cm.age_group,
      cm.team,
      cm.status,
      cm.created_at,
      p.display_name as profile_display_name,
      p.avatar_url as profile_avatar_url,
      p.phone as profile_phone
    from public.club_memberships cm
    inner join public.profiles p on p.user_id = cm.user_id
    left join public.club_member_master_records m on m.membership_id = cm.id
    where cm.club_id = _club_id
      and (
        v_full_roster
        or cm.user_id = v_uid
        or public.is_guardian_for_member(v_uid, cm.id)
      )
      and (
        _role_filter is null
        or trim(_role_filter) = ''
        or lower(trim(_role_filter)) = 'all'
        or cm.role::text = trim(_role_filter)
      )
      and (
        coalesce(p.display_name, '') ilike ('%' || q || '%')
        or coalesce(p.phone, '') ilike ('%' || q || '%')
        or coalesce(m.first_name, '') ilike ('%' || q || '%')
        or coalesce(m.last_name, '') ilike ('%' || q || '%')
        or coalesce(m.internal_club_number, '') ilike ('%' || q || '%')
      )
    order by cm.created_at desc
    limit lim
    offset off
  ) t;

  return jsonb_build_object('total', coalesce(total, 0), 'items', coalesce(items, '[]'::jsonb));
end;
$$;

revoke all on function public.search_club_members_page(uuid, text, text, int, int) from public;
grant execute on function public.search_club_members_page(uuid, text, text, int, int) to authenticated;

-- Trigger-internal helper only. The guardian-link INSERT policy is the public
-- authorization boundary; clients must never invoke this role mutator directly.
revoke all on function public.ensure_guardian_parent_role(uuid, uuid) from public;
revoke all on function public.ensure_guardian_parent_role(uuid, uuid) from anon;
revoke all on function public.ensure_guardian_parent_role(uuid, uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- Calendar subscriptions: self for any member, team for an authorized team or
-- linked ward team, club only for club staff.
-- ---------------------------------------------------------------------------
create or replace function public.create_calendar_subscription(
  _club_id uuid,
  _scope text default 'self',
  _team_id uuid default null,
  _label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_membership_id uuid;
  v_raw text;
  v_hash text;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.club_has_plan_feature(_club_id, 'calendarIcs') then
    return jsonb_build_object('ok', false, 'error', 'plan_feature_required');
  end if;

  if _scope not in ('club', 'team', 'self') then
    return jsonb_build_object('ok', false, 'error', 'invalid_scope');
  end if;

  if (_scope = 'team') <> (_team_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'invalid_team_scope');
  end if;

  select cm.id into v_membership_id
  from public.club_memberships cm
  where cm.club_id = _club_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;

  if v_membership_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_membership');
  end if;

  if _scope = 'club'
     and not (
       public.can_manage_club_members(v_uid, _club_id)
       or public.is_club_trainer(v_uid, _club_id)
     ) then
    return jsonb_build_object('ok', false, 'error', 'club_scope_forbidden');
  end if;

  if _scope = 'team' then
    if not exists (
      select 1 from public.teams t where t.id = _team_id and t.club_id = _club_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'team_not_found');
    end if;

    if not (
      public.is_trainer_for_team(v_uid, _team_id)
      or public.is_team_admin_user(v_uid, _team_id)
      or exists (
        select 1
        from public.team_players tp
        where tp.team_id = _team_id
          and tp.membership_id = v_membership_id
      )
      or exists (
        select 1
        from public.team_coaches tc
        where tc.team_id = _team_id
          and tc.membership_id = v_membership_id
      )
      or exists (
        select 1
        from public.club_member_guardian_links gl
        join public.team_players tp on tp.membership_id = gl.ward_membership_id
        where gl.guardian_membership_id = v_membership_id
          and gl.club_id = _club_id
          and tp.team_id = _team_id
      )
    ) then
      return jsonb_build_object('ok', false, 'error', 'team_scope_forbidden');
    end if;
  end if;

  v_raw := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_raw, 'sha256'), 'hex');

  insert into public.calendar_subscriptions (
    club_id, membership_id, scope, team_id, token_hash, label, created_by
  ) values (
    _club_id,
    v_membership_id,
    _scope,
    case when _scope = 'team' then _team_id else null end,
    v_hash,
    nullif(trim(coalesce(_label, '')), ''),
    v_uid
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'subscription_id', v_id,
    'token', v_raw
  );
end;
$$;

revoke all on function public.create_calendar_subscription(uuid, text, uuid, text) from public;
grant execute on function public.create_calendar_subscription(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Capacity: serialize all non-manager confirmations on the activity row.
-- This trigger is the final authority even if a caller performed a stale count.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_activity_attendance_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_confirmed integer;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select a.capacity into v_capacity
  from public.activities a
  where a.id = new.activity_id
  for update;

  if v_capacity is null then
    return new;
  end if;

  if new.responded_by is not null
     and public.can_manage_activity_attendance(new.responded_by, new.activity_id) then
    return new;
  end if;

  select count(*) into v_confirmed
  from public.activity_attendance aa
  where aa.activity_id = new.activity_id
    and aa.membership_id <> new.membership_id
    and aa.status in ('confirmed', 'attended');

  if v_confirmed >= v_capacity then
    new.status := 'waitlisted';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_activity_attendance_capacity() from public;

drop trigger if exists trg_enforce_activity_attendance_capacity on public.activity_attendance;
create trigger trg_enforce_activity_attendance_capacity
  before insert or update of status on public.activity_attendance
  for each row execute function public.enforce_activity_attendance_capacity();

create or replace function public._promote_activity_waitlist_internal(_activity_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.activities%rowtype;
  v_open integer;
  v_promoted integer := 0;
  v_row record;
  v_result_status text;
begin
  select * into v_activity
  from public.activities
  where id = _activity_id
  for update;

  if not found or v_activity.capacity is null then
    return 0;
  end if;

  select v_activity.capacity - count(*) into v_open
  from public.activity_attendance
  where activity_id = _activity_id
    and status in ('confirmed', 'attended');

  if v_open <= 0 then
    return 0;
  end if;

  for v_row in
    select id
    from public.activity_attendance
    where activity_id = _activity_id
      and status = 'waitlisted'
    order by responded_at nulls last, updated_at
    limit v_open
    for update
  loop
    update public.activity_attendance
    set status = 'confirmed', updated_at = now()
    where id = v_row.id
    returning status into v_result_status;

    if v_result_status = 'confirmed' then
      v_promoted := v_promoted + 1;
    end if;
  end loop;

  return v_promoted;
end;
$$;

revoke all on function public._promote_activity_waitlist_internal(uuid) from public;

-- ---------------------------------------------------------------------------
-- Reminder preferences: activity-type opt-out suppresses in-app + email;
-- email=false suppresses only the email recipient payload.
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
      case
        when coalesce(club_pref.email, global_pref.email, true)
          then coalesce(nullif(trim(p.email), ''), '')
        else ''
      end as email,
      coalesce(nullif(trim(p.display_name), ''), cm.id::text) as display_name
    from public.club_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
    left join public.member_notification_preferences club_pref
      on club_pref.user_id = cm.user_id
     and club_pref.club_id = v_activity.club_id
    left join public.member_notification_preferences global_pref
      on global_pref.user_id = cm.user_id
     and global_pref.club_id is null
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
      and (
        (v_activity.type = 'training' and coalesce(club_pref.training_reminders, global_pref.training_reminders, true))
        or (v_activity.type = 'match' and coalesce(club_pref.match_reminders, global_pref.match_reminders, true))
        or v_activity.type not in ('training', 'match')
        or v_activity.type is null
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

revoke all on function public.remind_missing_activity_attendance_service(uuid, text) from public;
grant execute on function public.remind_missing_activity_attendance_service(uuid, text) to service_role;

notify pgrst, 'reload schema';
