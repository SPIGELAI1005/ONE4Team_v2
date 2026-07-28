-- Optional warning cleanup: remove unused PL/pgSQL variables flagged by db lint.
-- Behavior is unchanged; only declaration hygiene.

create or replace function public.create_club_with_admin(
  _name text,
  _slug text,
  _description text default null,
  _is_public boolean default true,
  _plan_id text default 'kickoff',
  _metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _user_id uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _name is null or length(trim(_name)) = 0 then
    raise exception 'Club name is required';
  end if;
  if length(_name) > 100 then
    raise exception 'Club name must be under 100 characters';
  end if;
  if _description is not null and length(_description) > 500 then
    raise exception 'Description must be under 500 characters';
  end if;

  insert into public.clubs (
    name, slug, description, is_public,
    default_language, timezone, season_start_month
  )
  values (
    trim(_name), _slug, trim(_description), _is_public,
    coalesce(_metadata->>'language', 'en'),
    coalesce(_metadata->>'timezone', 'Europe/Berlin'),
    coalesce((_metadata->>'season_start_month')::int, 7)
  )
  returning id into _club_id;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (_club_id, _user_id, 'admin', 'active');

  begin
    insert into public.teams (club_id, name, age_group)
    values (_club_id, trim(_name) || ' - First Team', 'Senior');
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.announcements (club_id, title, content, author_id)
    values (
      _club_id,
      'Welcome to ' || trim(_name) || '!',
      'Your club has been created successfully on ONE4Team. Start by inviting your team members, setting up your teams, and configuring your club page.',
      _user_id
    );
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.billing_subscriptions (club_id, plan_id, billing_cycle, status, metadata)
    values (_club_id, _plan_id, 'monthly', 'trialing', _metadata)
    on conflict (club_id) do nothing;
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.shop_categories (club_id, name, is_active)
    values
      (_club_id, 'Jerseys', true),
      (_club_id, 'Training Gear', true),
      (_club_id, 'Fan Articles', true),
      (_club_id, 'Accessories', true);
  exception
    when undefined_table or undefined_column then null;
    when others then null;
  end;

  return _club_id;
end;
$$;


create or replace function public.create_platform_user(_email text, _role text, _reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  found_auth_user_id uuid;
  normalized_email text;
  platform_row public.platform_users%rowtype;
begin
  perform public.require_platform_owner();

  normalized_email := lower(trim(_email));
  if normalized_email is null or length(normalized_email) = 0 then
    raise exception 'Email is required.' using errcode = '22023';
  end if;

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _role not in ('OWNER', 'OPERATOR', 'SUPPORT', 'VIEWER') then
    raise exception 'Invalid platform role.' using errcode = '22023';
  end if;

  select u.id into found_auth_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if found_auth_user_id is null then
    raise exception 'No auth user exists for this email. Use the platform invite flow first.' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.platform_users pu where pu.auth_user_id = found_auth_user_id) then
    raise exception 'Platform user already exists for this account.' using errcode = '23505';
  end if;

  perform set_config('app.platform_audit_reason', trim(_reason), true);

  insert into public.platform_users (auth_user_id, email, role, status, created_by)
  values (found_auth_user_id, normalized_email, _role, 'ACTIVE', auth.uid())
  returning * into platform_row;

  return jsonb_build_object(
    'id', platform_row.id,
    'auth_user_id', platform_row.auth_user_id,
    'email', platform_row.email,
    'role', platform_row.role,
    'status', platform_row.status,
    'created_at', platform_row.created_at
  );
end;
$$;


create or replace function public.set_operator_club_status(_club_id uuid, _status text, _reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  after_row public.clubs%rowtype;
begin
  perform public.require_platform_permission('operator.clubs.manage');

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _status not in ('ACTIVE', 'TRIAL', 'PAYING', 'SUSPENDED', 'ARCHIVED') then
    raise exception 'Invalid club status.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.clubs where id = _club_id) then
    raise exception 'Club not found.' using errcode = 'P0002';
  end if;

  perform set_config('app.platform_audit_reason', trim(_reason), true);

  update public.clubs
  set status = _status, updated_at = now()
  where id = _club_id
  returning * into after_row;

  return jsonb_build_object(
    'id', after_row.id,
    'status', after_row.status,
    'updated_at', after_row.updated_at
  );
end;
$$;


create or replace function public.set_platform_setting(
  _key text,
  _value jsonb,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_value jsonb;
  next_value jsonb;
begin
  perform public.require_platform_owner();

  if _key is null or length(trim(_key)) = 0 then
    raise exception 'Setting key is required.' using errcode = '22023';
  end if;

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _key not in ('control_center_defaults', 'data_security', 'monitoring_connectors', 'alert_policies') then
    raise exception 'Unsupported platform setting key.' using errcode = '22023';
  end if;

  select ps.value into previous_value
  from public.platform_settings ps
  where ps.key = _key;

  next_value := coalesce(_value, '{}'::jsonb);

  insert into public.platform_settings (key, value, updated_at, updated_by)
  values (_key, next_value, now(), auth.uid())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;

  perform set_config('app.platform_audit_reason', trim(_reason), true);
  perform public.append_audit_log(
    'PLATFORM_SETTING_CHANGED',
    'platform_setting',
    _key,
    null,
    previous_value,
    next_value,
    trim(_reason),
    null,
    null
  );

  return next_value;
end;
$$;
