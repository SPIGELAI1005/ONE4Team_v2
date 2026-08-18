-- Follow-up for deployed DB lint findings:
-- - reminder email lives in auth.users, not profiles,
-- - club notification upsert must target its partial unique index,
-- - guest draft role requires the app_role cast.

create or replace function public.upsert_member_notification_preferences(
  _club_id uuid,
  _email boolean,
  _push boolean,
  _match_reminders boolean,
  _training_reminders boolean,
  _payment_reminders boolean,
  _weekly_digest_email boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if _club_id is not null and not public.is_member_of_club(v_uid, _club_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if _club_id is null then
    update public.member_notification_preferences
    set
      email = coalesce(_email, true),
      push = coalesce(_push, true),
      match_reminders = coalesce(_match_reminders, true),
      training_reminders = coalesce(_training_reminders, true),
      payment_reminders = coalesce(_payment_reminders, true),
      weekly_digest_email = coalesce(_weekly_digest_email, false),
      updated_at = now()
    where user_id = v_uid and club_id is null;

    if not found then
      insert into public.member_notification_preferences (
        user_id, club_id, email, push, match_reminders, training_reminders,
        payment_reminders, weekly_digest_email, updated_at
      ) values (
        v_uid, null,
        coalesce(_email, true), coalesce(_push, true),
        coalesce(_match_reminders, true), coalesce(_training_reminders, true),
        coalesce(_payment_reminders, true), coalesce(_weekly_digest_email, false),
        now()
      );
    end if;

    return jsonb_build_object('ok', true);
  end if;

  insert into public.member_notification_preferences (
    user_id, club_id, email, push, match_reminders, training_reminders,
    payment_reminders, weekly_digest_email, updated_at
  ) values (
    v_uid, _club_id,
    coalesce(_email, true), coalesce(_push, true),
    coalesce(_match_reminders, true), coalesce(_training_reminders, true),
    coalesce(_payment_reminders, true), coalesce(_weekly_digest_email, false),
    now()
  )
  on conflict (user_id, club_id) where club_id is not null do update
  set
    email = excluded.email,
    push = excluded.push,
    match_reminders = excluded.match_reminders,
    training_reminders = excluded.training_reminders,
    payment_reminders = excluded.payment_reminders,
    weekly_digest_email = excluded.weekly_digest_email,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.upsert_member_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.upsert_member_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

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

  if not public.club_has_plan_feature(v_guest.club_id, 'carpoolGuests') then
    return jsonb_build_object('ok', false, 'error', 'plan_feature_required');
  end if;

  if not (
    public.is_club_admin(v_uid, v_guest.club_id)
    or public.can_manage_activity_ops(v_uid, v_guest.activity_id)
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
      coalesce(nullif(trim(_draft_role), ''), 'player')::public.app_role,
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
          then coalesce(nullif(trim(u.email), ''), '')
        else ''
      end as email,
      coalesce(nullif(trim(p.display_name), ''), cm.id::text) as display_name
    from public.club_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
    left join auth.users u on u.id = cm.user_id
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
