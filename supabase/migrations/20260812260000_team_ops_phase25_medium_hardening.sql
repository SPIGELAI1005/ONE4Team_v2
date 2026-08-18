-- Phase 25 Medium hardening (Team Ops close-out)
-- M1/M2 transport scope + WITH CHECK; M3 server plan gates; M4 team-scoped ledger/guests;
-- M5 availability SELECT; L1 calendar subscription UPDATE via RPC only.

-- ---------------------------------------------------------------------------
-- M3 — Server-side plan entitlement helper (Prompt 17)
-- ---------------------------------------------------------------------------
create or replace function public.club_has_plan_feature(_club_id uuid, _feature text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan_id text;
  v_status text;
begin
  if _club_id is null or _feature is null then
    return false;
  end if;

  if _feature not in ('polls', 'calendarIcs', 'teamCashbox', 'carpoolGuests') then
    return false;
  end if;

  select b.plan_id, b.status into v_plan_id, v_status
  from public.billing_subscriptions b
  where b.club_id = _club_id
  order by b.updated_at desc nulls last
  limit 1;

  if v_status is null or v_status not in ('active', 'trialing') then
    return false;
  end if;

  v_plan_id := lower(coalesce(v_plan_id, ''));

  -- Kick-off+ (all paid)
  if _feature in ('polls', 'calendarIcs') then
    return v_plan_id in ('kickoff', 'squad', 'pro', 'champions', 'bespoke');
  end if;

  -- Pro+
  if _feature in ('teamCashbox', 'carpoolGuests') then
    return v_plan_id in ('pro', 'champions', 'bespoke');
  end if;

  return false;
end;
$$;

revoke all on function public.club_has_plan_feature(uuid, text) from public;
grant execute on function public.club_has_plan_feature(uuid, text) to authenticated, service_role;

-- Activity ops staff: admin, or trainer for activity team (club-wide trainer only if no team)
create or replace function public.can_manage_activity_ops(_user_id uuid, _activity_id uuid)
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
        or (
          a.team_id is not null
          and public.is_trainer_for_team(_user_id, a.team_id)
        )
        or (
          a.team_id is null
          and public.is_club_trainer(_user_id, a.club_id)
        )
      )
  );
$$;

revoke all on function public.can_manage_activity_ops(uuid, uuid) from public;
grant execute on function public.can_manage_activity_ops(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- M4 — Team-scoped cashbox manage (trainers only for their teams)
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_team_ledger(_user_id uuid, _club_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _user_id is not null
    and public.is_member_of_club(_user_id, _club_id)
    and (
      public.is_club_admin(_user_id, _club_id)
      or public.is_trainer_for_team(_user_id, _team_id)
      or public.is_team_admin_user(_user_id, _team_id)
      or exists (
        select 1
        from public.club_memberships cm
        where cm.club_id = _club_id
          and cm.user_id = _user_id
          and cm.status = 'active'
          and cm.role::text = 'team_management'
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- M1/M2 — Transport: team-scoped SELECT; WITH CHECK mirrors USING
-- ---------------------------------------------------------------------------
drop policy if exists "transport_offers_select" on public.activity_transport_offers;
create policy "transport_offers_select"
  on public.activity_transport_offers for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_own_membership(auth.uid(), driver_membership_id)
      or public.is_club_admin(auth.uid(), club_id)
      or public.can_manage_activity_ops(auth.uid(), activity_id)
      or exists (
        select 1
        from public.activities a
        join public.team_players tp on tp.team_id = a.team_id
        join public.club_memberships cm on cm.id = tp.membership_id
        where a.id = activity_transport_offers.activity_id
          and a.team_id is not null
          and cm.user_id = auth.uid()
          and cm.status = 'active'
      )
      or exists (
        select 1
        from public.activities a
        where a.id = activity_transport_offers.activity_id
          and a.team_id is null
          and public.is_member_of_club(auth.uid(), a.club_id)
      )
    )
  );

drop policy if exists "transport_offers_insert_self" on public.activity_transport_offers;
create policy "transport_offers_insert_self"
  on public.activity_transport_offers for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and public.is_own_membership(auth.uid(), driver_membership_id)
    and public.club_has_plan_feature(club_id, 'carpoolGuests')
  );

drop policy if exists "transport_offers_update_self_or_staff" on public.activity_transport_offers;
create policy "transport_offers_update_self_or_staff"
  on public.activity_transport_offers for update to authenticated
  using (
    public.is_own_membership(auth.uid(), driver_membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.can_manage_activity_ops(auth.uid(), activity_id)
  )
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_own_membership(auth.uid(), driver_membership_id)
      or public.is_club_admin(auth.uid(), club_id)
      or public.can_manage_activity_ops(auth.uid(), activity_id)
    )
    and public.club_has_plan_feature(club_id, 'carpoolGuests')
  );

drop policy if exists "transport_requests_insert_self" on public.activity_transport_requests;
create policy "transport_requests_insert_self"
  on public.activity_transport_requests for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and public.is_own_membership(auth.uid(), rider_membership_id)
    and public.club_has_plan_feature(club_id, 'carpoolGuests')
  );

drop policy if exists "transport_requests_update_parties" on public.activity_transport_requests;
create policy "transport_requests_update_parties"
  on public.activity_transport_requests for update to authenticated
  using (
    public.is_own_membership(auth.uid(), rider_membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.can_manage_activity_ops(auth.uid(), activity_id)
    or exists (
      select 1 from public.activity_transport_offers o
      where o.id = activity_transport_requests.offer_id
        and public.is_own_membership(auth.uid(), o.driver_membership_id)
    )
  )
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_own_membership(auth.uid(), rider_membership_id)
      or public.is_club_admin(auth.uid(), club_id)
      or public.can_manage_activity_ops(auth.uid(), activity_id)
      or exists (
        select 1 from public.activity_transport_offers o
        where o.id = activity_transport_requests.offer_id
          and public.is_own_membership(auth.uid(), o.driver_membership_id)
      )
    )
  );

-- Seat request RPC: plan gate (preserve original accept + seat increment semantics)
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
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_offer from public.activity_transport_offers where id = _offer_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.club_has_plan_feature(v_offer.club_id, 'carpoolGuests') then
    return jsonb_build_object('ok', false, 'error', 'plan_feature_required');
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

  insert into public.activity_transport_requests (
    club_id, activity_id, offer_id, rider_membership_id, status, note
  ) values (
    v_offer.club_id, v_offer.activity_id, v_offer.id, v_membership_id, 'accepted',
    nullif(trim(coalesce(_note, '')), '')
  )
  on conflict (offer_id, rider_membership_id) do update
    set status = 'accepted',
        note = excluded.note,
        updated_at = now()
  where activity_transport_requests.status in ('pending', 'cancelled', 'declined')
  returning id into v_req_id;

  if v_req_id is null then
    select id into v_req_id
    from public.activity_transport_requests
    where offer_id = v_offer.id and rider_membership_id = v_membership_id;
    return jsonb_build_object('ok', true, 'already', true, 'request_id', v_req_id);
  end if;

  update public.activity_transport_offers
  set
    seats_taken = seats_taken + 1,
    status = case when seats_taken + 1 >= seats_total then 'full' else status end,
    updated_at = now()
  where id = v_offer.id
    and seats_taken < seats_total;

  return jsonb_build_object('ok', true, 'request_id', v_req_id);
end;
$$;

revoke all on function public.request_activity_transport_seat(uuid, text) from public;
grant execute on function public.request_activity_transport_seat(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Guests: staff scoped to activity team + plan gate
-- ---------------------------------------------------------------------------
drop policy if exists "guest_participants_select_staff" on public.activity_guest_participants;
create policy "guest_participants_select_staff"
  on public.activity_guest_participants for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.can_manage_activity_ops(auth.uid(), activity_id)
  );

drop policy if exists "guest_participants_manage_staff" on public.activity_guest_participants;
create policy "guest_participants_manage_staff"
  on public.activity_guest_participants for all to authenticated
  using (
    (public.is_club_admin(auth.uid(), club_id) or public.can_manage_activity_ops(auth.uid(), activity_id))
    and public.club_has_plan_feature(club_id, 'carpoolGuests')
  )
  with check (
    (public.is_club_admin(auth.uid(), club_id) or public.can_manage_activity_ops(auth.uid(), activity_id))
    and public.club_has_plan_feature(club_id, 'carpoolGuests')
  );

-- ---------------------------------------------------------------------------
-- M5 — Availability: own / guardian / household / staff — not all club members
-- ---------------------------------------------------------------------------
drop policy if exists "member_availability_select_club" on public.member_availability;
create policy "member_availability_select_own_guardian_staff"
  on public.member_availability for select to authenticated
  using (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_guardian_for_member(auth.uid(), membership_id)
    or public.shares_login_email_with_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

-- ---------------------------------------------------------------------------
-- L1 — Calendar subscriptions: no direct UPDATE (revoke/create RPCs only)
-- ---------------------------------------------------------------------------
drop policy if exists "calendar_subscriptions_update_own" on public.calendar_subscriptions;

-- M3 — calendar create plan gate
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

  if _scope = 'team' and _team_id is null then
    return jsonb_build_object('ok', false, 'error', 'team_required');
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

-- M3 — poll create plan gate (preserve Wave 3 semantics + notifications)
create or replace function public.create_club_poll(
  _club_id uuid,
  _title text,
  _description text default null,
  _team_id uuid default null,
  _allow_multi boolean default false,
  _closes_at timestamptz default null,
  _options text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poll_id uuid;
  v_opt text;
  v_ord integer := 0;
  v_options text[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.club_has_plan_feature(_club_id, 'polls') then
    return jsonb_build_object('ok', false, 'error', 'plan_feature_required');
  end if;

  if not (
    public.is_club_admin(v_uid, _club_id)
    or public.is_club_trainer(v_uid, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if nullif(trim(_title), '') is null then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;

  v_options := coalesce(_options, array[]::text[]);
  if cardinality(v_options) < 2 then
    return jsonb_build_object('ok', false, 'error', 'options_required');
  end if;

  insert into public.club_polls (
    club_id, team_id, title, description, allow_multi, closes_at, created_by
  ) values (
    _club_id, _team_id, trim(_title), nullif(trim(coalesce(_description, '')), ''),
    coalesce(_allow_multi, false), _closes_at, v_uid
  )
  returning id into v_poll_id;

  foreach v_opt in array v_options loop
    if nullif(trim(v_opt), '') is null then
      continue;
    end if;
    insert into public.club_poll_options (poll_id, club_id, label, sort_order)
    values (v_poll_id, _club_id, trim(v_opt), v_ord);
    v_ord := v_ord + 1;
  end loop;

  if v_ord < 2 then
    delete from public.club_polls where id = v_poll_id;
    return jsonb_build_object('ok', false, 'error', 'options_required');
  end if;

  insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id)
  select
    _club_id,
    cm.user_id,
    'New poll',
    left(trim(_title), 120),
    'poll',
    v_poll_id
  from public.club_memberships cm
  where cm.club_id = _club_id
    and cm.status = 'active'
    and cm.user_id is not null
    and cm.user_id <> v_uid
    and (
      _team_id is null
      or exists (
        select 1 from public.team_players tp
        where tp.team_id = _team_id and tp.membership_id = cm.id
      )
    );

  return jsonb_build_object('ok', true, 'poll_id', v_poll_id);
end;
$$;

revoke all on function public.create_club_poll(uuid, text, text, uuid, boolean, timestamptz, text[]) from public;
grant execute on function public.create_club_poll(uuid, text, text, uuid, boolean, timestamptz, text[]) to authenticated;

-- M3 — ledger post plan gate (redefine with check; keep pending status)
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

  if not public.club_has_plan_feature(v_team.club_id, 'teamCashbox') then
    return jsonb_build_object('ok', false, 'error', 'plan_feature_required');
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

revoke all on function public.post_team_ledger_entry(uuid, text, numeric, text, text, date, uuid) from public;
grant execute on function public.post_team_ledger_entry(uuid, text, numeric, text, text, date, uuid) to authenticated;

-- Guest convert: plan + activity-scoped staff
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
