-- Public microsite: club-level documents & FAQ, public contact persons,
-- optional map coordinates / location notes on clubs, and richer join invite payloads.

-- ─── Club map / location notes (public contact page) ─────────────────────────
alter table public.clubs
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists public_location_notes text;

comment on column public.clubs.latitude is 'Optional WGS84 latitude for public map embed / directions.';
comment on column public.clubs.longitude is 'Optional WGS84 longitude for public map embed / directions.';
comment on column public.clubs.public_location_notes is 'Visitor-safe notes (e.g. pitch access, training locations).';

-- ─── Invite requests: optional fields for public join form ───────────────────
alter table public.club_invite_requests
  add column if not exists phone text,
  add column if not exists interested_role text,
  add column if not exists interested_team text,
  add column if not exists consent_at timestamptz;

comment on column public.club_invite_requests.interested_role is 'Visitor-selected role label (e.g. player, parent); not an app_role.';
comment on column public.club_invite_requests.consent_at is 'When the visitor acknowledged privacy/contact consent.';

-- ─── Club public documents (never expose rows with contains_personal_data) ───
create table if not exists public.club_public_documents (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  category text not null
    check (category in ('membership', 'policies', 'training', 'events', 'forms')),
  file_url text not null,
  sort_order int not null default 0,
  is_public boolean not null default false,
  contains_personal_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_public_documents_club_sort
  on public.club_public_documents (club_id, sort_order, created_at desc);

comment on table public.club_public_documents is
  'Curated downloads for the public club site. Visitors only see rows where is_public and not contains_personal_data.';
comment on column public.club_public_documents.contains_personal_data is
  'When true, row must never appear on the public site even if is_public is toggled by mistake.';

alter table public.club_public_documents enable row level security;

drop policy if exists "club_public_documents_select_public" on public.club_public_documents;
create policy "club_public_documents_select_public"
  on public.club_public_documents for select
  using (
    is_public = true
    and contains_personal_data is not true
    and exists (
      select 1 from public.clubs c
      where c.id = club_public_documents.club_id
        and c.is_public = true
    )
  );

drop policy if exists "club_public_documents_admin_all" on public.club_public_documents;
create policy "club_public_documents_admin_all"
  on public.club_public_documents for all
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ─── Public FAQ entries (shared across documents + join pages) ───────────────
create table if not exists public.club_public_faq_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_public_faq_club_sort
  on public.club_public_faq_items (club_id, sort_order, created_at desc);

alter table public.club_public_faq_items enable row level security;

drop policy if exists "club_public_faq_select_public" on public.club_public_faq_items;
create policy "club_public_faq_select_public"
  on public.club_public_faq_items for select
  using (
    is_public = true
    and exists (
      select 1 from public.clubs c
      where c.id = club_public_faq_items.club_id
        and c.is_public = true
    )
  );

drop policy if exists "club_public_faq_admin_all" on public.club_public_faq_items;
create policy "club_public_faq_admin_all"
  on public.club_public_faq_items for all
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ─── Optional named contacts shown on public contact page ────────────────────
create table if not exists public.club_public_contact_persons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  display_name text not null,
  role_title text,
  email text,
  phone text,
  show_on_public_website boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_public_contact_persons_club
  on public.club_public_contact_persons (club_id, sort_order, created_at desc);

alter table public.club_public_contact_persons enable row level security;

drop policy if exists "club_public_contact_persons_select_public" on public.club_public_contact_persons;
create policy "club_public_contact_persons_select_public"
  on public.club_public_contact_persons for select
  using (
    show_on_public_website = true
    and exists (
      select 1 from public.clubs c
      where c.id = club_public_contact_persons.club_id
        and c.is_public = true
    )
  );

drop policy if exists "club_public_contact_persons_admin_all" on public.club_public_contact_persons;
create policy "club_public_contact_persons_admin_all"
  on public.club_public_contact_persons for all
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ─── RPC: public invite (anon) with consent + optional role/team/phone ───────
drop function if exists public.request_club_invite(uuid, text, text, text);
drop function if exists public.request_club_invite(uuid, text, text, text, text, text, text, boolean);

create or replace function public.request_club_invite(
  _club_id uuid,
  _name text,
  _email text,
  _message text default null,
  _phone text default null,
  _interested_role text default null,
  _interested_team text default null,
  _consent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_email text;
  v_id uuid;
  v_phone text;
  v_role text;
  v_team text;
begin
  if _club_id is null then
    raise exception 'Missing club id';
  end if;

  if coalesce(_consent, false) is not true then
    raise exception 'Consent is required';
  end if;

  select c.is_public into v_is_public
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public invite requests';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'Name is required';
  end if;

  v_email := lower(trim(coalesce(_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Valid email is required';
  end if;

  v_phone := nullif(trim(coalesce(_phone, '')), '');
  v_role := nullif(trim(coalesce(_interested_role, '')), '');
  v_team := nullif(trim(coalesce(_interested_team, '')), '');

  perform public.enforce_request_rate_limit(
    'public_invite_request',
    _club_id,
    v_email,
    3,
    interval '24 hours'
  );

  insert into public.club_invite_requests (
    club_id, name, email, message, status,
    phone, interested_role, interested_team, consent_at
  )
  values (
    _club_id,
    trim(_name),
    v_email,
    nullif(trim(coalesce(_message, '')), ''),
    'pending',
    v_phone,
    v_role,
    v_team,
    now()
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this email.';
end;
$$;

revoke all on function public.request_club_invite(uuid, text, text, text, text, text, text, boolean) from public;
grant execute on function public.request_club_invite(uuid, text, text, text, text, text, text, boolean) to anon;
grant execute on function public.request_club_invite(uuid, text, text, text, text, text, text, boolean) to authenticated;

-- ─── RPC: authenticated join request with optional extras ────────────────────
drop function if exists public.register_club_join_request(uuid, text, text);
drop function if exists public.register_club_join_request(uuid, text, text, text, text, text, boolean);

create or replace function public.register_club_join_request(
  _club_id uuid,
  _name text,
  _message text default null,
  _phone text default null,
  _interested_role text default null,
  _interested_team text default null,
  _consent boolean default true
)
returns table (
  outcome text,
  role public.app_role,
  club_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_is_public boolean;
  v_mode text;
  v_default_role public.app_role;
  v_default_team text;
  v_request_id uuid;
  v_phone text;
  v_role text;
  v_team text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  if coalesce(_consent, false) is not true then
    raise exception 'Consent is required';
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email = '' then
    raise exception 'Account email required';
  end if;

  v_phone := nullif(trim(coalesce(_phone, '')), '');
  v_role := nullif(trim(coalesce(_interested_role, '')), '');
  v_team := nullif(trim(coalesce(_interested_team, '')), '');

  select
    c.is_public,
    c.join_approval_mode,
    c.join_default_role,
    c.join_default_team
  into
    v_is_public,
    v_mode,
    v_default_role,
    v_default_team
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public requests';
  end if;

  if exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = _club_id
      and cm.user_id = v_user_id
      and cm.status = 'active'
  ) then
    outcome := 'already_member';
    role := coalesce(v_default_role, 'member');
    club_id := _club_id;
    return next;
    return;
  end if;

  perform public.enforce_request_rate_limit(
    'public_join_request',
    _club_id,
    v_user_id::text,
    10,
    interval '1 hour'
  );

  if coalesce(v_mode, 'manual') = 'auto' then
    insert into public.club_memberships (club_id, user_id, role, status, team)
    values (
      _club_id,
      v_user_id,
      coalesce(v_default_role, 'member'),
      'active',
      nullif(trim(coalesce(v_default_team, '')), '')
    )
    on conflict (club_id, user_id)
    do update set
      status = 'active',
      role = excluded.role,
      team = coalesce(excluded.team, public.club_memberships.team);

    outcome := 'joined';
    role := coalesce(v_default_role, 'member');
    club_id := _club_id;
    return next;
    return;
  end if;

  begin
    insert into public.club_invite_requests (
      club_id, name, email, message, status, request_user_id,
      phone, interested_role, interested_team, consent_at
    )
    values (
      _club_id,
      coalesce(nullif(trim(coalesce(_name, '')), ''), split_part(v_email, '@', 1)),
      v_email,
      nullif(trim(coalesce(_message, '')), ''),
      'pending',
      v_user_id,
      v_phone,
      v_role,
      v_team,
      now()
    )
    returning id into v_request_id;
  exception
    when unique_violation then
      update public.club_invite_requests
      set
        name = coalesce(nullif(trim(coalesce(_name, '')), ''), split_part(v_email, '@', 1)),
        message = nullif(trim(coalesce(_message, '')), ''),
        request_user_id = v_user_id,
        phone = coalesce(v_phone, phone),
        interested_role = coalesce(v_role, interested_role),
        interested_team = coalesce(v_team, interested_team),
        consent_at = now()
      where club_id = _club_id
        and lower(email) = v_email
        and status = 'pending'
      returning id into v_request_id;
  end;

  outcome := 'pending';
  role := coalesce(v_default_role, 'member');
  club_id := _club_id;
  return next;
end;
$$;

revoke all on function public.register_club_join_request(uuid, text, text, text, text, text, boolean) from public;
grant execute on function public.register_club_join_request(uuid, text, text, text, text, text, boolean) to authenticated;
