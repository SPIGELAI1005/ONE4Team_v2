-- Wave 4 Team Operations: activity transport, guest participation, calendar ICS subscriptions.
-- Activity-scoped only — no top-level Transport module. Guests are not Auth users.

-- ---------------------------------------------------------------------------
-- 1) Transport offers + seat requests (privacy: meeting point optional text only)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_transport_offers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  driver_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  seats_total integer not null check (seats_total >= 1 and seats_total <= 8),
  seats_taken integer not null default 0 check (seats_taken >= 0),
  meeting_point text,
  notes text,
  status text not null default 'open'
    check (status in ('open', 'full', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_transport_offers_seats_check check (seats_taken <= seats_total),
  unique (activity_id, driver_membership_id)
);

create index if not exists activity_transport_offers_activity_idx
  on public.activity_transport_offers (club_id, activity_id);

drop trigger if exists update_activity_transport_offers_updated_at on public.activity_transport_offers;
create trigger update_activity_transport_offers_updated_at
  before update on public.activity_transport_offers
  for each row execute function public.update_updated_at();

create table if not exists public.activity_transport_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  offer_id uuid not null references public.activity_transport_offers(id) on delete cascade,
  rider_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, rider_membership_id)
);

create index if not exists activity_transport_requests_offer_idx
  on public.activity_transport_requests (offer_id, status);

drop trigger if exists update_activity_transport_requests_updated_at on public.activity_transport_requests;
create trigger update_activity_transport_requests_updated_at
  before update on public.activity_transport_requests
  for each row execute function public.update_updated_at();

alter table public.activity_transport_offers enable row level security;
alter table public.activity_transport_requests enable row level security;

drop policy if exists "transport_offers_select" on public.activity_transport_offers;
create policy "transport_offers_select"
  on public.activity_transport_offers for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "transport_offers_insert_self" on public.activity_transport_offers;
create policy "transport_offers_insert_self"
  on public.activity_transport_offers for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and public.is_own_membership(auth.uid(), driver_membership_id)
  );

drop policy if exists "transport_offers_update_self_or_staff" on public.activity_transport_offers;
create policy "transport_offers_update_self_or_staff"
  on public.activity_transport_offers for update to authenticated
  using (
    public.is_own_membership(auth.uid(), driver_membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  )
  with check (
    public.is_member_of_club(auth.uid(), club_id)
  );

drop policy if exists "transport_requests_select" on public.activity_transport_requests;
create policy "transport_requests_select"
  on public.activity_transport_requests for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_own_membership(auth.uid(), rider_membership_id)
      or public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
      or exists (
        select 1 from public.activity_transport_offers o
        where o.id = activity_transport_requests.offer_id
          and public.is_own_membership(auth.uid(), o.driver_membership_id)
      )
    )
  );

drop policy if exists "transport_requests_insert_self" on public.activity_transport_requests;
create policy "transport_requests_insert_self"
  on public.activity_transport_requests for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and public.is_own_membership(auth.uid(), rider_membership_id)
  );

drop policy if exists "transport_requests_update_parties" on public.activity_transport_requests;
create policy "transport_requests_update_parties"
  on public.activity_transport_requests for update to authenticated
  using (
    public.is_own_membership(auth.uid(), rider_membership_id)
    or public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
    or exists (
      select 1 from public.activity_transport_offers o
      where o.id = activity_transport_requests.offer_id
        and public.is_own_membership(auth.uid(), o.driver_membership_id)
    )
  )
  with check (public.is_member_of_club(auth.uid(), club_id));

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
-- 2) Guest / trial participants (no Auth user required)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_guest_participants (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  display_name text not null,
  contact_email text,
  contact_phone text,
  note text,
  status text not null default 'invited'
    check (status in ('invited', 'confirmed', 'declined', 'attended', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  converted_membership_id uuid references public.club_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_guest_participants_activity_idx
  on public.activity_guest_participants (club_id, activity_id);

drop trigger if exists update_activity_guest_participants_updated_at on public.activity_guest_participants;
create trigger update_activity_guest_participants_updated_at
  before update on public.activity_guest_participants
  for each row execute function public.update_updated_at();

alter table public.activity_guest_participants enable row level security;

drop policy if exists "guest_participants_select_staff" on public.activity_guest_participants;
create policy "guest_participants_select_staff"
  on public.activity_guest_participants for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

drop policy if exists "guest_participants_manage_staff" on public.activity_guest_participants;
create policy "guest_participants_manage_staff"
  on public.activity_guest_participants for all to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

-- ---------------------------------------------------------------------------
-- 3) Calendar ICS subscriptions (opaque token hash — never store raw token)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_subscriptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  scope text not null default 'club'
    check (scope in ('club', 'team', 'self')),
  team_id uuid references public.teams(id) on delete cascade,
  token_hash text not null unique,
  label text,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_subscriptions_team_scope_check check (
    (scope = 'team' and team_id is not null)
    or (scope <> 'team' and team_id is null)
  )
);

create index if not exists calendar_subscriptions_member_idx
  on public.calendar_subscriptions (club_id, membership_id)
  where revoked_at is null;

drop trigger if exists update_calendar_subscriptions_updated_at on public.calendar_subscriptions;
create trigger update_calendar_subscriptions_updated_at
  before update on public.calendar_subscriptions
  for each row execute function public.update_updated_at();

alter table public.calendar_subscriptions enable row level security;

drop policy if exists "calendar_subscriptions_select_own" on public.calendar_subscriptions;
create policy "calendar_subscriptions_select_own"
  on public.calendar_subscriptions for select to authenticated
  using (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
  );

drop policy if exists "calendar_subscriptions_insert_own" on public.calendar_subscriptions;
create policy "calendar_subscriptions_insert_own"
  on public.calendar_subscriptions for insert to authenticated
  with check (
    public.is_own_membership(auth.uid(), membership_id)
    and public.is_member_of_club(auth.uid(), club_id)
  );

drop policy if exists "calendar_subscriptions_update_own" on public.calendar_subscriptions;
create policy "calendar_subscriptions_update_own"
  on public.calendar_subscriptions for update to authenticated
  using (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
  )
  with check (
    public.is_own_membership(auth.uid(), membership_id)
    or public.is_club_admin(auth.uid(), club_id)
  );

create or replace function public.create_calendar_subscription(
  _club_id uuid,
  _scope text default 'club',
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

  -- Raw token returned once; client must store/display — never persisted plaintext.
  return jsonb_build_object(
    'ok', true,
    'subscription_id', v_id,
    'token', v_raw
  );
end;
$$;

revoke all on function public.create_calendar_subscription(uuid, text, uuid, text) from public;
grant execute on function public.create_calendar_subscription(uuid, text, uuid, text) to authenticated;

create or replace function public.revoke_calendar_subscription(_subscription_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.calendar_subscriptions%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.calendar_subscriptions where id = _subscription_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not (
    public.is_own_membership(v_uid, v_row.membership_id)
    or public.is_club_admin(v_uid, v_row.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.calendar_subscriptions
  set revoked_at = now(), updated_at = now()
  where id = v_row.id and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.revoke_calendar_subscription(uuid) from public;
grant execute on function public.revoke_calendar_subscription(uuid) to authenticated;
