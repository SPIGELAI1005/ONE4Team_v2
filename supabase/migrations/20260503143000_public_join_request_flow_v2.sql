-- Public join / invite requests: source + name split, reviewer fields, privacy gate on RPC,
-- invited-only auto-join, honeypot placeholder, admin in-app notifications, approve with role/team.

-- ─── Schema: club_invite_requests ─────────────────────────────────────────────
alter table public.club_invite_requests
  add column if not exists source text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists internal_note text;

comment on column public.club_invite_requests.source is 'Origin funnel label, e.g. public_club_page.';
comment on column public.club_invite_requests.internal_note is 'Staff-only note; never shown on the public site.';

-- ─── Clubs: mirror invited-only auto setting from published page config ─────
alter table public.clubs
  add column if not exists join_auto_approve_invited_only boolean not null default false;

comment on column public.clubs.join_auto_approve_invited_only is
  'When join_approval_mode is auto, only users with a valid pending club_invite for their email are auto-joined; others get a pending join request.';

-- ─── Publish: persist join_auto_approve_invited_only ──────────────────────────
create or replace function public.publish_club_public_page_config(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_draft jsonb;
  g jsonb;
  b jsonb;
  a jsonb;
  ct jsonb;
  so jsonb;
  se jsonb;
  ob jsonb;
  psec jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_club_admin(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  select d.config into v_draft
  from public.club_public_page_drafts d
  where d.club_id = p_club_id;

  if v_draft is null or v_draft = '{}'::jsonb then
    raise exception 'no_draft';
  end if;

  g := coalesce(v_draft->'general', '{}'::jsonb);
  b := coalesce(v_draft->'branding', '{}'::jsonb);
  a := coalesce(v_draft->'assets', '{}'::jsonb);
  ct := coalesce(v_draft->'contact', '{}'::jsonb);
  so := coalesce(v_draft->'social', '{}'::jsonb);
  se := coalesce(v_draft->'seo', '{}'::jsonb);
  ob := coalesce(v_draft->'onboarding', '{}'::jsonb);
  psec := v_draft->'publicPageSections';

  update public.clubs c
  set
    name = coalesce(nullif(trim(both from g->>'name'), ''), c.name),
    slug = coalesce(nullif(trim(both from g->>'slug'), ''), c.slug),
    description = nullif(trim(both from g->>'description'), ''),
    is_public = coalesce((g->>'is_public')::boolean, c.is_public),
    default_language = coalesce(nullif(trim(both from g->>'default_language'), ''), c.default_language),
    timezone = coalesce(nullif(trim(both from g->>'timezone'), ''), c.timezone),
    club_category = nullif(trim(both from g->>'club_category'), ''),
    primary_color = nullif(trim(both from b->>'primary_color'), ''),
    secondary_color = nullif(trim(both from b->>'secondary_color'), ''),
    tertiary_color = nullif(trim(both from b->>'tertiary_color'), ''),
    support_color = nullif(trim(both from b->>'support_color'), ''),
    logo_url = nullif(trim(both from a->>'logo_url'), ''),
    favicon_url = nullif(trim(both from a->>'favicon_url'), ''),
    cover_image_url = nullif(trim(both from a->>'cover_image_url'), ''),
    reference_images = coalesce(a->'reference_images', c.reference_images),
    address = nullif(trim(both from ct->>'address'), ''),
    phone = nullif(trim(both from ct->>'phone'), ''),
    email = nullif(trim(both from ct->>'email'), ''),
    website = nullif(trim(both from ct->>'website'), ''),
    latitude = case
      when ct ? 'latitude' and nullif(trim(both from ct->>'latitude'), '') is not null
        then (ct->>'latitude')::double precision
      else c.latitude
    end,
    longitude = case
      when ct ? 'longitude' and nullif(trim(both from ct->>'longitude'), '') is not null
        then (ct->>'longitude')::double precision
      else c.longitude
    end,
    public_location_notes = coalesce(nullif(trim(both from ct->>'public_location_notes'), ''), c.public_location_notes),
    facebook_url = nullif(trim(both from so->>'facebook_url'), ''),
    instagram_url = nullif(trim(both from so->>'instagram_url'), ''),
    twitter_url = nullif(trim(both from so->>'twitter_url'), ''),
    youtube_url = nullif(trim(both from so->>'youtube_url'), ''),
    tiktok_url = nullif(trim(both from so->>'tiktok_url'), ''),
    meta_title = nullif(trim(both from se->>'meta_title'), ''),
    meta_description = nullif(trim(both from se->>'meta_description'), ''),
    og_image_url = nullif(trim(both from se->>'og_image_url'), ''),
    public_seo_allow_indexing = case
      when se ? 'allow_indexing' then (se->>'allow_indexing')::boolean
      else coalesce(c.public_seo_allow_indexing, true)
    end,
    public_seo_structured_data = case
      when se ? 'structured_data_enabled' then (se->>'structured_data_enabled')::boolean
      else coalesce(c.public_seo_structured_data, true)
    end,
    join_approval_mode = case
      when nullif(trim(both from ob->>'join_approval_mode'), '') in ('manual', 'auto')
        then trim(both from ob->>'join_approval_mode')
      else c.join_approval_mode
    end,
    join_reviewer_policy = case
      when nullif(trim(both from ob->>'join_reviewer_policy'), '') in ('admin_only', 'admin_trainer')
        then trim(both from ob->>'join_reviewer_policy')
      else c.join_reviewer_policy
    end,
    join_default_role = coalesce(nullif(trim(both from ob->>'join_default_role'), ''), c.join_default_role),
    join_default_team = nullif(trim(both from ob->>'join_default_team'), ''),
    join_auto_approve_invited_only = case
      when ob ? 'join_auto_approve_invited_only' then (ob->>'join_auto_approve_invited_only')::boolean
      else coalesce(c.join_auto_approve_invited_only, false)
    end,
    public_page_sections = coalesce(psec, c.public_page_sections),
    public_page_published_config = v_draft,
    public_page_published_at = now(),
    public_page_published_by = v_uid,
    public_page_publish_version = coalesce(c.public_page_publish_version, 0) + 1
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'club_id', p_club_id,
    'published_at', now(),
    'version', (select cc.public_page_publish_version from public.clubs cc where cc.id = p_club_id)
  );
end;
$$;

-- ─── Helper: published privacy allows public join funnel ───────────────────────
create or replace function public.club_accepts_public_join_requests(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        case
          when c.public_page_published_config is null then true
          else
            coalesce((c.public_page_published_config->'privacy'->>'allow_join_requests_public')::boolean, true)
            and coalesce((c.public_page_published_config->'visibilityRules'->>'disable_join_requests_public')::boolean, false)
            is not true
        end
      from public.clubs c
      where c.id = _club_id
    ),
    false
  );
$$;

revoke all on function public.club_accepts_public_join_requests(uuid) from public;
grant execute on function public.club_accepts_public_join_requests(uuid) to anon, authenticated;

-- ─── Notify club admins (in-app); security definer bypasses RLS as owner ─────
create or replace function public._notify_club_join_request_created(
  p_club_id uuid,
  p_request_id uuid,
  p_applicant_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select cm.user_id
    from public.club_memberships cm
    where cm.club_id = p_club_id
      and cm.status = 'active'
      and cm.role = 'admin'::public.app_role
  loop
    insert into public.notifications (
      club_id, user_id, title, body, notification_type, reference_id
    )
    values (
      p_club_id,
      r.user_id,
      'New join request',
      left('Review the pending request from ' || coalesce(nullif(trim(p_applicant_label), ''), 'a visitor') || '.', 500),
      'club_join_request',
      p_request_id
    );
  end loop;
end;
$$;

revoke all on function public._notify_club_join_request_created(uuid, uuid, text) from public;

-- ─── RPC: public invite (anon) — first/last name, source, honeypot, privacy ───
drop function if exists public.request_club_invite(uuid, text, text, text, text, text, text, boolean);

create or replace function public.request_club_invite(
  _club_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _message text default null,
  _phone text default null,
  _interested_role text default null,
  _interested_team text default null,
  _consent boolean default false,
  _website_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_allow_join boolean;
  v_email text;
  v_id uuid;
  v_phone text;
  v_role text;
  v_team text;
  v_fn text;
  v_ln text;
  v_display text;
begin
  if _club_id is null then
    raise exception 'Missing club id';
  end if;

  if nullif(trim(coalesce(_website_url, '')), '') is not null then
    raise exception 'Unable to submit request.';
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

  if not public.club_accepts_public_join_requests(_club_id) then
    raise exception 'This club is not accepting public invite requests';
  end if;

  v_fn := trim(coalesce(_first_name, ''));
  v_ln := trim(coalesce(_last_name, ''));
  if length(v_fn) < 1 or length(v_ln) < 1 then
    raise exception 'First and last name are required';
  end if;

  v_display := v_fn || ' ' || v_ln;

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
    phone, interested_role, interested_team, consent_at,
    source, first_name, last_name
  )
  values (
    _club_id,
    v_display,
    v_email,
    nullif(trim(coalesce(_message, '')), ''),
    'pending',
    v_phone,
    v_role,
    v_team,
    now(),
    'public_club_page',
    v_fn,
    v_ln
  )
  returning id into v_id;

  perform public._notify_club_join_request_created(_club_id, v_id, v_display);

  return v_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this email.';
end;
$$;

revoke all on function public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text) to anon;
grant execute on function public.request_club_invite(uuid, text, text, text, text, text, text, text, boolean, text) to authenticated;

-- ─── RPC: authenticated join request — invited-only auto path + honeypot ─────
drop function if exists public.register_club_join_request(uuid, text, text, text, text, text, boolean);

create or replace function public.register_club_join_request(
  _club_id uuid,
  _name text,
  _message text default null,
  _phone text default null,
  _interested_role text default null,
  _interested_team text default null,
  _consent boolean default true,
  _first_name text default null,
  _last_name text default null,
  _website_url text default null
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
  v_fn text;
  v_ln text;
  v_display text;
  v_allow_join boolean;
  v_auto_invited_only boolean;
  v_has_invite boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  if nullif(trim(coalesce(_website_url, '')), '') is not null then
    raise exception 'Unable to submit request.';
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

  v_fn := nullif(trim(coalesce(_first_name, '')), '');
  v_ln := nullif(trim(coalesce(_last_name, '')), '');
  if v_fn is not null and v_ln is not null then
    v_display := v_fn || ' ' || v_ln;
  else
    v_display := coalesce(nullif(trim(coalesce(_name, '')), ''), split_part(v_email, '@', 1));
  end if;

  select
    c.is_public,
    c.join_approval_mode,
    c.join_default_role,
    c.join_default_team,
    coalesce(c.join_auto_approve_invited_only, false)
  into
    v_is_public,
    v_mode,
    v_default_role,
    v_default_team,
    v_auto_invited_only
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public requests';
  end if;

  v_allow_join := public.club_accepts_public_join_requests(_club_id);
  if not v_allow_join then
    raise exception 'This club is not accepting public join requests';
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

  select exists (
    select 1
    from public.club_invites ci
    where ci.club_id = _club_id
      and ci.used_at is null
      and (ci.expires_at is null or ci.expires_at > now())
      and ci.email is not null
      and lower(trim(ci.email)) = v_email
  ) into v_has_invite;

  if coalesce(v_mode, 'manual') = 'auto' then
    if coalesce(v_auto_invited_only, false) is true and v_has_invite is not true then
      v_mode := 'manual';
    end if;
  end if;

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
      phone, interested_role, interested_team, consent_at,
      source, first_name, last_name
    )
    values (
      _club_id,
      v_display,
      v_email,
      nullif(trim(coalesce(_message, '')), ''),
      'pending',
      v_user_id,
      v_phone,
      v_role,
      v_team,
      now(),
      'public_club_page',
      v_fn,
      v_ln
    )
    returning id into v_request_id;
  exception
    when unique_violation then
      update public.club_invite_requests cir
      set
        name = v_display,
        message = nullif(trim(coalesce(_message, '')), ''),
        request_user_id = v_user_id,
        phone = coalesce(v_phone, cir.phone),
        interested_role = coalesce(v_role, cir.interested_role),
        interested_team = coalesce(v_team, cir.interested_team),
        consent_at = now(),
        source = coalesce(cir.source, 'public_club_page'),
        first_name = coalesce(v_fn, cir.first_name),
        last_name = coalesce(v_ln, cir.last_name)
      where cir.club_id = _club_id
        and lower(cir.email) = v_email
        and cir.status = 'pending'
      returning cir.id into v_request_id;
  end;

  perform public._notify_club_join_request_created(_club_id, v_request_id, v_display);

  outcome := 'pending';
  role := coalesce(v_default_role, 'member');
  club_id := _club_id;
  return next;
end;
$$;

revoke all on function public.register_club_join_request(uuid, text, text, text, text, text, boolean, text, text, text) from public;
grant execute on function public.register_club_join_request(uuid, text, text, text, text, text, boolean, text, text, text) to authenticated;

-- ─── Approve: optional membership role + team overrides ───────────────────────
drop function if exists public.approve_club_join_request(uuid);

create or replace function public.approve_club_join_request(
  _request_id uuid,
  _membership_role public.app_role default null,
  _membership_team text default null
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
  v_request public.club_invite_requests%rowtype;
  v_default_role public.app_role;
  v_default_team text;
  v_target_role public.app_role;
  v_target_team text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_request
  from public.club_invite_requests
  where id = _request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if not public.can_review_club_join_requests(auth.uid(), v_request.club_id) then
    raise exception 'Only configured reviewers can approve requests';
  end if;

  if v_request.status <> 'pending' then
    outcome := 'already_processed';
    role := 'member';
    club_id := v_request.club_id;
    return next;
    return;
  end if;

  select c.join_default_role, c.join_default_team
  into v_default_role, v_default_team
  from public.clubs c
  where c.id = v_request.club_id;

  v_target_role := coalesce(_membership_role, v_default_role, 'member'::public.app_role);
  v_target_team := coalesce(
    nullif(trim(coalesce(_membership_team, '')), ''),
    nullif(trim(coalesce(v_default_team, '')), '')
  );

  if v_request.request_user_id is null then
    outcome := 'requires_invite';
    role := v_target_role;
    club_id := v_request.club_id;
    return next;
    return;
  end if;

  insert into public.club_memberships (club_id, user_id, role, status, team)
  values (
    v_request.club_id,
    v_request.request_user_id,
    v_target_role,
    'active',
    v_target_team
  )
  on conflict (club_id, user_id)
  do update set
    status = 'active',
    role = excluded.role,
    team = coalesce(excluded.team, public.club_memberships.team);

  update public.club_invite_requests
  set status = 'approved'
  where id = v_request.id;

  outcome := 'joined';
  role := v_target_role;
  club_id := v_request.club_id;
  return next;
end;
$$;

revoke all on function public.approve_club_join_request(uuid, public.app_role, text) from public;
grant execute on function public.approve_club_join_request(uuid, public.app_role, text) to authenticated;

-- Backfill column from already-published JSON (best-effort).
update public.clubs c
set join_auto_approve_invited_only = coalesce((c.public_page_published_config->'onboarding'->>'join_auto_approve_invited_only')::boolean, false)
where c.public_page_published_config ? 'onboarding';
