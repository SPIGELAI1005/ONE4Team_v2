-- Operator enhancements: platform settings, support diagnostics, monitoring connectors.

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_no_direct_access on public.platform_settings;
create policy platform_settings_no_direct_access
on public.platform_settings
for all
to authenticated
using (false)
with check (false);

insert into public.platform_settings (key, value)
values
  (
    'control_center_defaults',
    jsonb_build_object(
      'default_plan_key', null,
      'trial_module_keys', '[]'::jsonb,
      'support_contact_email', null,
      'billing_contact_email', null
    )
  ),
  (
    'data_security',
    jsonb_build_object(
      'audit_retention_days', 365,
      'support_impersonation_enabled', false,
      'support_impersonation_requires_reason', true
    )
  ),
  (
    'monitoring_connectors',
    jsonb_build_object(
      'vercel', jsonb_build_object('connected', false, 'label', 'Vercel'),
      'supabase_metrics', jsonb_build_object('connected', true, 'label', 'Supabase'),
      'sentry', jsonb_build_object('connected', false, 'label', 'Sentry'),
      'resend', jsonb_build_object('connected', false, 'label', 'Resend email'),
      'custom_logs', jsonb_build_object('connected', false, 'label', 'Custom logs')
    )
  ),
  (
    'alert_policies',
    jsonb_build_object(
      'notify_on_owner_role_change', true,
      'notify_on_club_suspended', false,
      'notify_on_failed_invite_spike', false,
      'delivery_channel', 'none'
    )
  )
on conflict (key) do nothing;

create or replace function public.get_platform_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_platform_permission('operator.settings.read');

  return coalesce(
    (
      select jsonb_object_agg(ps.key, ps.value)
      from public.platform_settings ps
    ),
    '{}'::jsonb
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
  current_owner jsonb;
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

create or replace function public.get_operator_monitoring_connectors()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  connectors jsonb;
begin
  perform public.require_platform_permission('operator.logs.read');

  select ps.value into connectors
  from public.platform_settings ps
  where ps.key = 'monitoring_connectors';

  return coalesce(connectors, '{}'::jsonb);
end;
$$;

create or replace function public.get_operator_support_club_diagnostics(_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  club_row public.clubs%rowtype;
  plan_name text;
  enabled_modules integer;
  member_count integer;
  failed_invites_7d integer;
  open_issues integer;
begin
  perform public.require_platform_permission('operator.support.use');

  select * into club_row
  from public.clubs c
  where c.id = _club_id;

  if not found then
    raise exception 'Club not found' using errcode = 'P0002';
  end if;

  select p.name into plan_name
  from public.billing_subscriptions bs
  join public.plans p on p.id = bs.plan_id
  where bs.club_id = _club_id
  order by bs.updated_at desc nulls last
  limit 1;

  select count(*)::integer into enabled_modules
  from public.club_module_entitlements cme
  where cme.club_id = _club_id
    and cme.enabled = true
    and (cme.valid_until is null or cme.valid_until > now());

  select count(*)::integer into member_count
  from public.club_memberships cm
  where cm.club_id = _club_id;

  select count(*)::integer into failed_invites_7d
  from public.club_invites ci
  where ci.club_id = _club_id
    and ci.used_at is null
    and ci.expires_at is not null
    and ci.expires_at < now()
    and ci.created_at >= now() - interval '7 days';

  select count(*)::integer into open_issues
  from public.abuse_alerts aa
  where aa.club_id = _club_id
    and aa.status = 'open';

  return jsonb_build_object(
    'club', jsonb_build_object(
      'id', club_row.id,
      'name', club_row.name,
      'slug', club_row.slug,
      'status', club_row.status,
      'created_at', club_row.created_at,
      'updated_at', club_row.updated_at
    ),
    'plan_name', plan_name,
    'enabled_modules', enabled_modules,
    'member_count', member_count,
    'failed_invites_7d', failed_invites_7d,
    'open_issues', open_issues,
    'public_club_url', '/club/' || club_row.slug
  );
end;
$$;

create or replace function public.get_operator_support_user_diagnostics(_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text;
  auth_user_id uuid;
  profile_row public.profiles%rowtype;
  platform_role text;
  platform_status text;
begin
  perform public.require_platform_permission('operator.support.use');

  normalized_email := lower(trim(_email));
  if normalized_email is null or length(normalized_email) = 0 then
    raise exception 'Email is required.' using errcode = '22023';
  end if;

  select u.id into auth_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if auth_user_id is null then
    return jsonb_build_object(
      'found', false,
      'email', normalized_email
    );
  end if;

  select * into profile_row
  from public.profiles p
  where p.user_id = auth_user_id;

  select pu.role, pu.status
  into platform_role, platform_status
  from public.platform_users pu
  where pu.auth_user_id = auth_user_id;

  return jsonb_build_object(
    'found', true,
    'email', normalized_email,
    'user_id', auth_user_id,
    'display_name', coalesce(nullif(trim(profile_row.display_name), ''), normalized_email),
    'profile_updated_at', profile_row.updated_at,
    'platform_role', platform_role,
    'platform_status', platform_status,
    'clubs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'club_id', cm.club_id,
          'club_name', c.name,
          'club_slug', c.slug,
          'role', cm.role,
          'status', cm.status,
          'joined_at', cm.created_at
        )
        order by cm.created_at desc
      )
      from public.club_memberships cm
      join public.clubs c on c.id = cm.club_id
      where cm.user_id = auth_user_id
    ), '[]'::jsonb),
    'recent_invites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'club_id', ci.club_id,
          'club_name', c.name,
          'role', ci.role,
          'created_at', ci.created_at,
          'expires_at', ci.expires_at,
          'used_at', ci.used_at,
          'status', case
            when ci.used_at is not null then 'used'
            when ci.expires_at is not null and ci.expires_at < now() then 'expired'
            else 'pending'
          end
        )
        order by ci.created_at desc
      )
      from (
        select *
        from public.club_invites ci
        where lower(coalesce(ci.email, '')) = normalized_email
        order by ci.created_at desc
        limit 10
      ) ci
      join public.clubs c on c.id = ci.club_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.check_operator_invite_delivery(
  _email text,
  _club_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text;
begin
  perform public.require_platform_permission('operator.support.use');

  normalized_email := lower(trim(_email));
  if normalized_email is null or length(normalized_email) = 0 then
    raise exception 'Email is required.' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'email', normalized_email,
    'club_id', _club_id,
    'invites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'club_id', ci.club_id,
          'club_name', c.name,
          'role', ci.role,
          'created_at', ci.created_at,
          'expires_at', ci.expires_at,
          'used_at', ci.used_at,
          'delivery_status', case
            when ci.used_at is not null then 'accepted'
            when ci.expires_at is not null and ci.expires_at < now() then 'expired'
            else 'pending'
          end,
          'note', 'Email delivery telemetry is not connected yet. Status reflects invite record only.'
        )
        order by ci.created_at desc
      )
      from (
        select *
        from public.club_invites ci
        where lower(coalesce(ci.email, '')) = normalized_email
          and (_club_id is null or ci.club_id = _club_id)
        order by ci.created_at desc
        limit 20
      ) ci
      join public.clubs c on c.id = ci.club_id
    ), '[]'::jsonb),
    'failed_notifications_7d', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'club_id', e.club_id,
          'club_name', c.name,
          'status', e.status,
          'last_error', left(coalesce(e.last_error, ''), 240),
          'created_at', e.created_at
        )
        order by e.created_at desc
      )
      from (
        select *
        from public.abuse_notification_events e
        where e.status = 'failed'
          and e.created_at >= now() - interval '7 days'
          and (_club_id is null or e.club_id = _club_id)
        order by e.created_at desc
        limit 10
      ) e
      join public.clubs c on c.id = e.club_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_platform_settings() from public;
revoke all on function public.set_platform_setting(text, jsonb, text) from public;
revoke all on function public.get_operator_monitoring_connectors() from public;
revoke all on function public.get_operator_support_club_diagnostics(uuid) from public;
revoke all on function public.get_operator_support_user_diagnostics(text) from public;
revoke all on function public.check_operator_invite_delivery(text, uuid) from public;

grant execute on function public.get_platform_settings() to authenticated;
grant execute on function public.set_platform_setting(text, jsonb, text) to authenticated;
grant execute on function public.get_operator_monitoring_connectors() to authenticated;
grant execute on function public.get_operator_support_club_diagnostics(uuid) to authenticated;
grant execute on function public.get_operator_support_user_diagnostics(text) to authenticated;
grant execute on function public.check_operator_invite_delivery(text, uuid) to authenticated;
