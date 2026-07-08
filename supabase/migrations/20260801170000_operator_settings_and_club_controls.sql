-- Platform user management, extended audit actions, and controlled club status/plan changes.

-- Expand club lifecycle statuses for operator control.
alter table public.clubs drop constraint if exists clubs_status_check;
update public.clubs set status = 'SUSPENDED' where status = 'DISABLED';
alter table public.clubs
  add constraint clubs_status_check
  check (status in ('ACTIVE', 'TRIAL', 'PAYING', 'SUSPENDED', 'ARCHIVED'));

create or replace function public.audit_club_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_reason text;
begin
  if auth.uid() is null then
    return new;
  end if;

  audit_reason := nullif(current_setting('app.platform_audit_reason', true), '');

  if old.status is distinct from new.status then
    perform public.append_audit_log(
      'CLUB_STATUS_CHANGED',
      'club',
      new.id::text,
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      audit_reason
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_platform_user_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_reason text;
begin
  if auth.uid() is null then
    return new;
  end if;

  audit_reason := nullif(current_setting('app.platform_audit_reason', true), '');

  if tg_op = 'INSERT' then
    perform public.append_audit_log(
      'PLATFORM_USER_CREATED',
      'platform_user',
      new.id::text,
      null,
      null,
      to_jsonb(new) - 'auth_user_id',
      audit_reason
    );
    return new;
  end if;

  if old.role is distinct from new.role then
    perform public.append_audit_log(
      'PLATFORM_USER_ROLE_CHANGED',
      'platform_user',
      new.id::text,
      null,
      jsonb_build_object('role', old.role, 'status', old.status),
      jsonb_build_object('role', new.role, 'status', new.status),
      audit_reason
    );
  end if;

  if old.status is distinct from new.status and new.status = 'DISABLED' then
    perform public.append_audit_log(
      'PLATFORM_USER_DISABLED',
      'platform_user',
      new.id::text,
      null,
      to_jsonb(old) - 'auth_user_id',
      to_jsonb(new) - 'auth_user_id',
      audit_reason
    );
  elsif old.status is distinct from new.status and new.status = 'ACTIVE' then
    perform public.append_audit_log(
      'PLATFORM_USER_ENABLED',
      'platform_user',
      new.id::text,
      null,
      to_jsonb(old) - 'auth_user_id',
      to_jsonb(new) - 'auth_user_id',
      audit_reason
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_platform_users_change on public.platform_users;
create trigger audit_platform_users_change
after insert or update of status, role
on public.platform_users
for each row execute function public.audit_platform_user_change();

create or replace function public.require_platform_owner()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
begin
  current_platform_user := public.require_platform_permission('operator.access.manage');

  if coalesce(current_platform_user ->> 'role', '') <> 'OWNER' then
    raise exception 'Only OWNER can manage platform users.' using errcode = '42501';
  end if;

  return current_platform_user;
end;
$$;

create or replace function public.get_platform_users()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  perform public.require_platform_permission('operator.settings.read');

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', pu.id,
        'auth_user_id', pu.auth_user_id,
        'email', pu.email,
        'display_name', coalesce(
          nullif(trim(p.display_name), ''),
          split_part(pu.email, '@', 1)
        ),
        'role', pu.role,
        'status', pu.status,
        'created_at', pu.created_at,
        'last_active_at', greatest(
          pu.updated_at,
          coalesce(p.updated_at, pu.created_at),
          coalesce((
            select max(ue.created_at)
            from public.usage_events ue
            where ue.user_id = pu.auth_user_id
          ), pu.created_at)
        )
      )
      order by pu.created_at desc
    )
    from public.platform_users pu
    left join public.profiles p on p.user_id = pu.auth_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_platform_user(
  _email text,
  _role text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_owner jsonb;
  found_auth_user_id uuid;
  normalized_email text;
  platform_row public.platform_users%rowtype;
  active_owner_count integer;
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

create or replace function public.update_platform_user_role(
  _platform_user_id uuid,
  _role text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row public.platform_users%rowtype;
  after_row public.platform_users%rowtype;
  active_owner_count integer;
begin
  perform public.require_platform_owner();

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _role not in ('OWNER', 'OPERATOR', 'SUPPORT', 'VIEWER') then
    raise exception 'Invalid platform role.' using errcode = '22023';
  end if;

  select * into before_row from public.platform_users where id = _platform_user_id;
  if not found then
    raise exception 'Platform user not found.' using errcode = 'P0002';
  end if;

  if before_row.auth_user_id = auth.uid() and _role <> before_row.role then
    raise exception 'You cannot change your own platform role.' using errcode = '42501';
  end if;

  if before_row.role = 'OWNER' and _role <> 'OWNER' then
    select count(*)::integer into active_owner_count
    from public.platform_users
    where role = 'OWNER' and status = 'ACTIVE';

    if active_owner_count <= 1 then
      raise exception 'Cannot remove the last active OWNER.' using errcode = '42501';
    end if;
  end if;

  perform set_config('app.platform_audit_reason', trim(_reason), true);

  update public.platform_users
  set role = _role, updated_at = now()
  where id = _platform_user_id
  returning * into after_row;

  return to_jsonb(after_row) - 'auth_user_id';
end;
$$;

create or replace function public.set_platform_user_status(
  _platform_user_id uuid,
  _status text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row public.platform_users%rowtype;
  after_row public.platform_users%rowtype;
  active_owner_count integer;
begin
  perform public.require_platform_owner();

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _status not in ('ACTIVE', 'DISABLED') then
    raise exception 'Invalid platform user status.' using errcode = '22023';
  end if;

  select * into before_row from public.platform_users where id = _platform_user_id;
  if not found then
    raise exception 'Platform user not found.' using errcode = 'P0002';
  end if;

  if before_row.auth_user_id = auth.uid() and _status = 'DISABLED' then
    raise exception 'You cannot disable your own platform access.' using errcode = '42501';
  end if;

  if before_row.role = 'OWNER' and _status = 'DISABLED' then
    select count(*)::integer into active_owner_count
    from public.platform_users
    where role = 'OWNER' and status = 'ACTIVE';

    if active_owner_count <= 1 then
      raise exception 'Cannot disable the last active OWNER.' using errcode = '42501';
    end if;
  end if;

  perform set_config('app.platform_audit_reason', trim(_reason), true);

  update public.platform_users
  set status = _status, updated_at = now()
  where id = _platform_user_id
  returning * into after_row;

  return to_jsonb(after_row) - 'auth_user_id';
end;
$$;

-- Service-role helper for invite-platform-user edge function.
create or replace function public.grant_platform_user_from_invite(
  _auth_user_id uuid,
  _email text,
  _role text,
  _reason text,
  _invited_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  platform_row public.platform_users%rowtype;
begin
  if _role not in ('OWNER', 'OPERATOR', 'SUPPORT', 'VIEWER') then
    raise exception 'Invalid platform role.' using errcode = '22023';
  end if;

  if exists (select 1 from public.platform_users where auth_user_id = _auth_user_id) then
    raise exception 'Platform user already exists.' using errcode = '23505';
  end if;

  perform set_config('app.platform_audit_reason', coalesce(nullif(trim(_reason), ''), 'Platform invite accepted.'), true);

  insert into public.platform_users (auth_user_id, email, role, status, created_by)
  values (_auth_user_id, lower(trim(_email)), _role, 'ACTIVE', _invited_by)
  returning * into platform_row;

  return to_jsonb(platform_row) - 'auth_user_id';
end;
$$;

create or replace function public.preview_operator_club_plan_change(
  _club_id uuid,
  _plan_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_plan_id uuid;
begin
  perform public.require_platform_permission('operator.clubs.read');

  select id into target_plan_id
  from public.plans
  where key = lower(trim(_plan_key))
    and status = 'ACTIVE'
  limit 1;

  if target_plan_id is null then
    raise exception 'Plan not found or inactive.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'plan_key', lower(trim(_plan_key)),
    'included_by_new_plan', coalesce((
      select jsonb_agg(jsonb_build_object('key', m.key, 'name', m.name) order by m.name)
      from public.plan_modules pm
      join public.modules m on m.id = pm.module_id
      where pm.plan_id = target_plan_id and pm.included = true and m.status = 'ACTIVE'
    ), '[]'::jsonb),
    'manually_enabled', coalesce((
      select jsonb_agg(jsonb_build_object('key', m.key, 'name', m.name, 'source', cme.source) order by m.name)
      from public.club_module_entitlements cme
      join public.modules m on m.id = cme.module_id
      where cme.club_id = _club_id
        and cme.enabled = true
        and cme.source <> 'PLAN'
        and (cme.valid_until is null or cme.valid_until > now())
    ), '[]'::jsonb),
    'kept_active_not_in_plan', coalesce((
      select jsonb_agg(jsonb_build_object('key', m.key, 'name', m.name, 'source', cme.source) order by m.name)
      from public.club_module_entitlements cme
      join public.modules m on m.id = cme.module_id
      where cme.club_id = _club_id
        and cme.enabled = true
        and cme.source <> 'PLAN'
        and (cme.valid_until is null or cme.valid_until > now())
        and not exists (
          select 1 from public.plan_modules pm
          where pm.plan_id = target_plan_id and pm.module_id = m.id and pm.included = true
        )
    ), '[]'::jsonb),
    'disabled', coalesce((
      select jsonb_agg(jsonb_build_object('key', m.key, 'name', m.name, 'source', cme.source) order by m.name)
      from public.club_module_entitlements cme
      join public.modules m on m.id = cme.module_id
      where cme.club_id = _club_id
        and cme.enabled = false
        and (cme.valid_until is null or cme.valid_until > now())
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_operator_club_status(
  _club_id uuid,
  _status text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row public.clubs%rowtype;
  after_row public.clubs%rowtype;
begin
  perform public.require_platform_permission('operator.clubs.manage');

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if _status not in ('ACTIVE', 'TRIAL', 'PAYING', 'SUSPENDED', 'ARCHIVED') then
    raise exception 'Invalid club status.' using errcode = '22023';
  end if;

  select * into before_row from public.clubs where id = _club_id;
  if not found then
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

create or replace function public.set_operator_club_plan(
  _club_id uuid,
  _plan_key text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  before_plan text;
  after_plan text;
  target_plan public.plans%rowtype;
  subscription_row public.billing_subscriptions%rowtype;
begin
  perform public.require_platform_permission('operator.clubs.manage');

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  select * into target_plan
  from public.plans
  where key = lower(trim(_plan_key))
    and status = 'ACTIVE'
  limit 1;

  if not found then
    raise exception 'Plan not found or inactive.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.clubs where id = _club_id) then
    raise exception 'Club not found.' using errcode = 'P0002';
  end if;

  select bs.plan_id into before_plan
  from public.billing_subscriptions bs
  where bs.club_id = _club_id
  limit 1;

  if before_plan is null then
    insert into public.billing_subscriptions (club_id, plan_id, billing_cycle, status, created_by)
    values (_club_id, target_plan.key, 'monthly', 'active', auth.uid())
    returning * into subscription_row;
    after_plan := subscription_row.plan_id;
  else
    update public.billing_subscriptions
    set plan_id = target_plan.key, updated_at = now()
    where club_id = _club_id
    returning * into subscription_row;
    after_plan := subscription_row.plan_id;
  end if;

  perform public.append_audit_log(
    'PLAN_CHANGED',
    'club_subscription',
    subscription_row.id::text,
    _club_id,
    jsonb_build_object('plan_key', before_plan),
    jsonb_build_object('plan_key', after_plan, 'plan_name', target_plan.name),
    trim(_reason)
  );

  return jsonb_build_object(
    'club_id', _club_id,
    'plan_key', after_plan,
    'plan_name', target_plan.name,
    'billing_status', subscription_row.status
  );
end;
$$;

revoke all on function public.require_platform_owner() from public;
revoke all on function public.get_platform_users() from public;
revoke all on function public.create_platform_user(text, text, text) from public;
revoke all on function public.update_platform_user_role(uuid, text, text) from public;
revoke all on function public.set_platform_user_status(uuid, text, text) from public;
revoke all on function public.grant_platform_user_from_invite(uuid, text, text, text, uuid) from public;
revoke all on function public.preview_operator_club_plan_change(uuid, text) from public;
revoke all on function public.set_operator_club_status(uuid, text, text) from public;
revoke all on function public.set_operator_club_plan(uuid, text, text) from public;

grant execute on function public.require_platform_owner() to authenticated;
grant execute on function public.get_platform_users() to authenticated;
grant execute on function public.create_platform_user(text, text, text) to authenticated;
grant execute on function public.update_platform_user_role(uuid, text, text) to authenticated;
grant execute on function public.set_platform_user_status(uuid, text, text) to authenticated;
grant execute on function public.preview_operator_club_plan_change(uuid, text) to authenticated;
grant execute on function public.set_operator_club_status(uuid, text, text) to authenticated;
grant execute on function public.set_operator_club_plan(uuid, text, text) to authenticated;

grant execute on function public.grant_platform_user_from_invite(uuid, text, text, text, uuid) to service_role;
