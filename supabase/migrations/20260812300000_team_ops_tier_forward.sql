-- Team Ops Tier 1–4 forward: guest draft+invite RPC, notification prefs DB,
-- activity capacity/waitlist, transport driver accept, series_id scaffold.

-- ---------------------------------------------------------------------------
-- 1) Guest → draft + invite (security definer — trainers cannot insert club_invites via RLS)
-- ---------------------------------------------------------------------------
create or replace function public.convert_activity_guest_to_draft_invite(
  _guest_id uuid,
  _draft_role text default 'player'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_guest public.activity_guest_participants%rowtype;
  v_draft_id uuid;
  v_invite_id uuid;
  v_token text;
  v_hash text;
  v_email text;
  v_name text;
  v_role public.app_role;
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

  if v_guest.converted_membership_id is not null then
    return jsonb_build_object('ok', false, 'error', 'already_converted');
  end if;

  v_email := nullif(trim(coalesce(v_guest.contact_email, '')), '');
  v_name := nullif(trim(coalesce(v_guest.display_name, '')), '');
  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'email_required');
  end if;

  v_role := coalesce(nullif(trim(_draft_role), '')::public.app_role, 'player'::public.app_role);

  if v_guest.converted_draft_id is not null then
    select id into v_draft_id from public.club_member_drafts where id = v_guest.converted_draft_id;
    if v_draft_id is null then
      return jsonb_build_object('ok', false, 'error', 'draft_missing');
    end if;
    select invite_id into v_invite_id from public.club_member_drafts where id = v_draft_id;
    if v_invite_id is not null then
      return jsonb_build_object('ok', false, 'error', 'already_invited');
    end if;
  else
    insert into public.club_member_drafts (
      club_id, name, email, role, status, created_by
    ) values (
      v_guest.club_id,
      coalesce(v_name, v_email),
      lower(v_email),
      v_role,
      'draft',
      v_uid
    )
    returning id into v_draft_id;

    update public.activity_guest_participants
    set converted_draft_id = v_draft_id, updated_at = now()
    where id = v_guest.id;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.club_invites (
    club_id, email, role, token_hash, expires_at, invite_payload
  ) values (
    v_guest.club_id,
    lower(v_email),
    v_role,
    v_hash,
    now() + interval '14 days',
    jsonb_build_object('name', coalesce(v_name, v_email), 'language', 'en')
  )
  returning id into v_invite_id;

  update public.club_member_drafts
  set
    status = 'invited',
    invite_id = v_invite_id,
    invited_at = now(),
    updated_at = now()
  where id = v_draft_id;

  return jsonb_build_object(
    'ok', true,
    'draft_id', v_draft_id,
    'invite_id', v_invite_id,
    'invite_token', v_token,
    'email', lower(v_email),
    'name', coalesce(v_name, v_email)
  );
end;
$$;

revoke all on function public.convert_activity_guest_to_draft_invite(uuid, text) from public;
grant execute on function public.convert_activity_guest_to_draft_invite(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Persistent notification preferences (per user; club_id null = global)
-- ---------------------------------------------------------------------------
create table if not exists public.member_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  email boolean not null default true,
  push boolean not null default true,
  match_reminders boolean not null default true,
  training_reminders boolean not null default true,
  payment_reminders boolean not null default true,
  weekly_digest_email boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists member_notification_preferences_user_global_idx
  on public.member_notification_preferences (user_id)
  where club_id is null;

create unique index if not exists member_notification_preferences_user_club_idx
  on public.member_notification_preferences (user_id, club_id)
  where club_id is not null;

create index if not exists member_notification_preferences_user_idx
  on public.member_notification_preferences (user_id);

alter table public.member_notification_preferences enable row level security;

drop policy if exists "member_notif_prefs_select_self" on public.member_notification_preferences;
create policy "member_notif_prefs_select_self"
  on public.member_notification_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "member_notif_prefs_upsert_self" on public.member_notification_preferences;
create policy "member_notif_prefs_insert_self"
  on public.member_notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "member_notif_prefs_update_self" on public.member_notification_preferences;
create policy "member_notif_prefs_update_self"
  on public.member_notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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
    user_id,
    club_id,
    email,
    push,
    match_reminders,
    training_reminders,
    payment_reminders,
    weekly_digest_email,
    updated_at
  ) values (
    v_uid,
    _club_id,
    coalesce(_email, true),
    coalesce(_push, true),
    coalesce(_match_reminders, true),
    coalesce(_training_reminders, true),
    coalesce(_payment_reminders, true),
    coalesce(_weekly_digest_email, false),
    now()
  )
  on conflict (user_id, club_id) do update
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

-- ---------------------------------------------------------------------------
-- 3) Activity capacity + waitlisted status
-- ---------------------------------------------------------------------------
alter table public.activities
  add column if not exists capacity integer check (capacity is null or capacity >= 1);

alter table public.activities
  add column if not exists series_id uuid references public.activities(id) on delete set null;

comment on column public.activities.series_id is
  'Optional recurring-series anchor (scaffold). Full series editor deferred — links sibling occurrences.';

alter table public.activity_attendance drop constraint if exists activity_attendance_status_check;

alter table public.activity_attendance
  add constraint activity_attendance_status_check
  check (status in ('invited', 'confirmed', 'declined', 'attended', 'maybe', 'waitlisted'));

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
begin
  select * into v_activity from public.activities where id = _activity_id;
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
    select id, membership_id
    from public.activity_attendance
    where activity_id = _activity_id
      and status = 'waitlisted'
    order by responded_at nulls last, updated_at
    limit v_open
  loop
    update public.activity_attendance
    set status = 'confirmed', updated_at = now()
    where id = v_row.id;
    v_promoted := v_promoted + 1;
  end loop;

  return v_promoted;
end;
$$;

revoke all on function public._promote_activity_waitlist_internal(uuid) from public;

create or replace function public.promote_activity_waitlist(_activity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_club_id uuid;
  v_promoted integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select club_id into v_club_id from public.activities where id = _activity_id;
  if v_club_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not (
    public.is_club_admin(v_uid, v_club_id)
    or public.is_club_trainer(v_uid, v_club_id)
    or public.can_manage_activity_attendance(v_uid, _activity_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_promoted := public._promote_activity_waitlist_internal(_activity_id);
  return jsonb_build_object('ok', true, 'promoted', v_promoted);
end;
$$;

revoke all on function public.promote_activity_waitlist(uuid) from public;
grant execute on function public.promote_activity_waitlist(uuid) to authenticated;

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
  v_prev_status text;
  v_confirmed_count integer;
  v_promoted integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_status not in ('confirmed', 'declined', 'maybe', 'attended', 'invited', 'waitlisted') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if v_reason is not null
     and v_reason not in ('illness', 'injury', 'holiday', 'school', 'family', 'work', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_response_reason');
  end if;

  select * into v_activity from public.activities where id = _activity_id;
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

  if not v_can_manage and v_status in ('attended', 'invited', 'waitlisted') then
    return jsonb_build_object('ok', false, 'error', 'status_not_allowed');
  end if;

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

  select status into v_prev_status
  from public.activity_attendance
  where activity_id = _activity_id and membership_id = _membership_id;

  -- Capacity: non-managers requesting confirmed may be waitlisted.
  if v_status = 'confirmed'
     and not v_can_manage
     and v_activity.capacity is not null then
    select count(*) into v_confirmed_count
    from public.activity_attendance
    where activity_id = _activity_id
      and status in ('confirmed', 'attended')
      and membership_id <> _membership_id;

    if v_confirmed_count >= v_activity.capacity then
      v_status := 'waitlisted';
    end if;
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

  if v_status = 'declined' and coalesce(v_prev_status, '') in ('confirmed', 'attended', 'waitlisted') then
    v_promoted := public._promote_activity_waitlist_internal(_activity_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'promoted', coalesce(v_promoted, 0),
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

-- ---------------------------------------------------------------------------
-- 4) Transport: pending requests + driver accept/decline
-- ---------------------------------------------------------------------------
create or replace function public.request_activity_transport_seat(
  _offer_id uuid,
  _note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.activity_transport_offers%rowtype;
  v_membership_id uuid;
  v_req_id uuid;
  v_existing_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_offer from public.activity_transport_offers where id = _offer_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_offer.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'not_open');
  end if;

  if v_offer.seats_taken >= v_offer.seats_total then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  select cm.id into v_membership_id
  from public.club_memberships cm
  where cm.club_id = v_offer.club_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;

  if v_membership_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_membership');
  end if;

  if v_membership_id = v_offer.driver_membership_id then
    return jsonb_build_object('ok', false, 'error', 'own_offer');
  end if;

  select status into v_existing_status
  from public.activity_transport_requests
  where offer_id = v_offer.id and rider_membership_id = v_membership_id;

  if v_existing_status = 'accepted' then
    return jsonb_build_object('ok', true, 'already', true, 'status', 'accepted');
  end if;

  if v_existing_status = 'pending' then
    return jsonb_build_object('ok', true, 'already', true, 'status', 'pending');
  end if;

  insert into public.activity_transport_requests (
    club_id, activity_id, offer_id, rider_membership_id, status, note
  ) values (
    v_offer.club_id, v_offer.activity_id, v_offer.id, v_membership_id, 'pending',
    nullif(trim(coalesce(_note, '')), '')
  )
  on conflict (offer_id, rider_membership_id) do update
    set status = 'pending',
        note = excluded.note,
        updated_at = now()
  where activity_transport_requests.status in ('cancelled', 'declined')
  returning id into v_req_id;

  if v_req_id is null then
    select id into v_req_id
    from public.activity_transport_requests
    where offer_id = v_offer.id and rider_membership_id = v_membership_id;
  end if;

  return jsonb_build_object('ok', true, 'request_id', v_req_id, 'status', 'pending');
end;
$$;

create or replace function public.accept_activity_transport_request(_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.activity_transport_requests%rowtype;
  v_offer public.activity_transport_offers%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_req from public.activity_transport_requests where id = _request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  select * into v_offer from public.activity_transport_offers where id = v_req.offer_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'offer_not_found');
  end if;

  if not (
    public.is_own_membership(v_uid, v_offer.driver_membership_id)
    or public.is_club_admin(v_uid, v_req.club_id)
    or public.is_club_trainer(v_uid, v_req.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_offer.status <> 'open' or v_offer.seats_taken >= v_offer.seats_total then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  update public.activity_transport_requests
  set status = 'accepted', updated_at = now()
  where id = v_req.id;

  update public.activity_transport_offers
  set
    seats_taken = seats_taken + 1,
    status = case when seats_taken + 1 >= seats_total then 'full' else status end,
    updated_at = now()
  where id = v_offer.id
    and seats_taken < seats_total;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_activity_transport_request(uuid) from public;
grant execute on function public.accept_activity_transport_request(uuid) to authenticated;

create or replace function public.decline_activity_transport_request(_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.activity_transport_requests%rowtype;
  v_offer public.activity_transport_offers%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_req from public.activity_transport_requests where id = _request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_req.status not in ('pending', 'accepted') then
    return jsonb_build_object('ok', false, 'error', 'not_actionable');
  end if;

  select * into v_offer from public.activity_transport_offers where id = v_req.offer_id for update;

  if not (
    public.is_own_membership(v_uid, v_offer.driver_membership_id)
    or public.is_own_membership(v_uid, v_req.rider_membership_id)
    or public.is_club_admin(v_uid, v_req.club_id)
    or public.is_club_trainer(v_uid, v_req.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_req.status = 'accepted' then
    update public.activity_transport_offers
    set
      seats_taken = greatest(0, seats_taken - 1),
      status = case when status = 'full' then 'open' else status end,
      updated_at = now()
    where id = v_offer.id;
  end if;

  update public.activity_transport_requests
  set status = 'declined', updated_at = now()
  where id = v_req.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.decline_activity_transport_request(uuid) from public;
grant execute on function public.decline_activity_transport_request(uuid) to authenticated;
