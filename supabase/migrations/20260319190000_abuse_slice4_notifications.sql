-- Phase 12 / Slice 4: abuse outbound notifications + policy automation

create table if not exists public.abuse_notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  channel text not null check (channel in ('webhook', 'email')),
  endpoint_url text,
  recipient_email text,
  secret_token text,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint abuse_notification_endpoints_target_chk check (
    (channel = 'webhook' and endpoint_url is not null)
    or (channel = 'email' and recipient_email is not null)
  )
);

create table if not exists public.abuse_escalation_policies (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  severity text not null check (severity in ('medium', 'high', 'critical')),
  min_blocked_attempts integer not null default 5,
  min_unique_identifiers integer not null default 2,
  cooldown_minutes integer not null default 60,
  notify_enabled boolean not null default true,
  auto_resolve_after_minutes integer,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, severity)
);

create table if not exists public.abuse_notification_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  alert_id uuid references public.abuse_alerts(id) on delete set null,
  endpoint_id uuid not null references public.abuse_notification_endpoints(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'delivered', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists abuse_notification_endpoints_club_idx on public.abuse_notification_endpoints(club_id);
create index if not exists abuse_escalation_policies_club_idx on public.abuse_escalation_policies(club_id);
create index if not exists abuse_notification_events_club_status_idx on public.abuse_notification_events(club_id, status, created_at desc);

alter table public.abuse_notification_endpoints enable row level security;
alter table public.abuse_escalation_policies enable row level security;
alter table public.abuse_notification_events enable row level security;

drop policy if exists abuse_notification_endpoints_select_member on public.abuse_notification_endpoints;
create policy abuse_notification_endpoints_select_member
on public.abuse_notification_endpoints
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists abuse_notification_endpoints_manage_reviewer on public.abuse_notification_endpoints;
create policy abuse_notification_endpoints_manage_reviewer
on public.abuse_notification_endpoints
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists abuse_escalation_policies_select_member on public.abuse_escalation_policies;
create policy abuse_escalation_policies_select_member
on public.abuse_escalation_policies
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists abuse_escalation_policies_manage_admin on public.abuse_escalation_policies;
create policy abuse_escalation_policies_manage_admin
on public.abuse_escalation_policies
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists abuse_notification_events_select_member on public.abuse_notification_events;
create policy abuse_notification_events_select_member
on public.abuse_notification_events
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists abuse_notification_events_manage_admin on public.abuse_notification_events;
create policy abuse_notification_events_manage_admin
on public.abuse_notification_events
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create or replace function public.queue_abuse_notifications(
  _club_id uuid,
  _alert_id uuid,
  _payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_member_of_club(_club_id, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  insert into public.abuse_notification_events (club_id, alert_id, endpoint_id, payload)
  select _club_id, _alert_id, e.id, _payload
  from public.abuse_notification_endpoints e
  where e.club_id = _club_id and e.is_active = true
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.apply_abuse_escalation_policy(
  _club_id uuid,
  _severity text,
  _blocked_attempts integer,
  _unique_identifiers integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.abuse_escalation_policies%rowtype;
  should_escalate boolean := false;
begin
  if not public.is_member_of_club(_club_id, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select *
  into p
  from public.abuse_escalation_policies
  where club_id = _club_id and severity = _severity
  limit 1;

  if p.id is null then
    return jsonb_build_object(
      'matched', false,
      'reason', 'policy_not_found'
    );
  end if;

  should_escalate := (_blocked_attempts >= p.min_blocked_attempts and _unique_identifiers >= p.min_unique_identifiers);

  return jsonb_build_object(
    'matched', true,
    'escalate', should_escalate,
    'notify_enabled', p.notify_enabled,
    'cooldown_minutes', p.cooldown_minutes,
    'auto_resolve_after_minutes', p.auto_resolve_after_minutes
  );
end;
$$;
