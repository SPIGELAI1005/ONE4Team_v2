-- Fix reversed arguments: is_member_of_club(_user_id, _club_id) and is_club_admin(_user_id, _club_id).
-- Previous policies used (club_id, auth.uid()) which never matched real memberships.

-- ---------------------------------------------------------------------------
-- Billing + shop (v21_v22)
-- ---------------------------------------------------------------------------
drop policy if exists billing_subscriptions_select_member on public.billing_subscriptions;
create policy billing_subscriptions_select_member
on public.billing_subscriptions
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists billing_subscriptions_manage_admin on public.billing_subscriptions;
create policy billing_subscriptions_manage_admin
on public.billing_subscriptions
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists billing_events_select_member on public.billing_events;
create policy billing_events_select_member
on public.billing_events
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists billing_events_manage_admin on public.billing_events;
create policy billing_events_manage_admin
on public.billing_events
for insert
to authenticated
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists shop_categories_select_member on public.shop_categories;
create policy shop_categories_select_member
on public.shop_categories
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists shop_categories_manage_admin on public.shop_categories;
create policy shop_categories_manage_admin
on public.shop_categories
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists shop_products_select_member on public.shop_products;
create policy shop_products_select_member
on public.shop_products
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists shop_products_manage_admin on public.shop_products;
create policy shop_products_manage_admin
on public.shop_products
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists shop_orders_select_member on public.shop_orders;
create policy shop_orders_select_member
on public.shop_orders
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists shop_orders_insert_member on public.shop_orders;
create policy shop_orders_insert_member
on public.shop_orders
for insert
to authenticated
with check (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists shop_orders_manage_admin on public.shop_orders;
create policy shop_orders_manage_admin
on public.shop_orders
for update
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- Abuse slice 4
-- ---------------------------------------------------------------------------
drop policy if exists abuse_notification_endpoints_select_member on public.abuse_notification_endpoints;
create policy abuse_notification_endpoints_select_member
on public.abuse_notification_endpoints
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists abuse_notification_endpoints_manage_reviewer on public.abuse_notification_endpoints;
create policy abuse_notification_endpoints_manage_reviewer
on public.abuse_notification_endpoints
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists abuse_escalation_policies_select_member on public.abuse_escalation_policies;
create policy abuse_escalation_policies_select_member
on public.abuse_escalation_policies
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists abuse_escalation_policies_manage_admin on public.abuse_escalation_policies;
create policy abuse_escalation_policies_manage_admin
on public.abuse_escalation_policies
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists abuse_notification_events_select_member on public.abuse_notification_events;
create policy abuse_notification_events_select_member
on public.abuse_notification_events
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists abuse_notification_events_manage_admin on public.abuse_notification_events;
create policy abuse_notification_events_manage_admin
on public.abuse_notification_events
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

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
  if not public.is_member_of_club(auth.uid(), _club_id) then
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
  if not public.is_member_of_club(auth.uid(), _club_id) then
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

-- ---------------------------------------------------------------------------
-- Partner workflows (v23)
-- ---------------------------------------------------------------------------
drop policy if exists partner_contracts_select_member on public.partner_contracts;
create policy partner_contracts_select_member
on public.partner_contracts
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists partner_contracts_manage_admin on public.partner_contracts;
create policy partner_contracts_manage_admin
on public.partner_contracts
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists partner_invoices_select_member on public.partner_invoices;
create policy partner_invoices_select_member
on public.partner_invoices
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists partner_invoices_manage_admin on public.partner_invoices;
create policy partner_invoices_manage_admin
on public.partner_invoices
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists partner_tasks_select_member on public.partner_tasks;
create policy partner_tasks_select_member
on public.partner_tasks
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists partner_tasks_manage_admin on public.partner_tasks;
create policy partner_tasks_manage_admin
on public.partner_tasks
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- Multi-sport + automation (v24_v25)
-- ---------------------------------------------------------------------------
drop policy if exists club_sports_select_member on public.club_sports;
create policy club_sports_select_member
on public.club_sports
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_sports_manage_admin on public.club_sports;
create policy club_sports_manage_admin
on public.club_sports
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists automation_rules_select_member on public.automation_rules;
create policy automation_rules_select_member
on public.automation_rules
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists automation_rules_manage_admin on public.automation_rules;
create policy automation_rules_manage_admin
on public.automation_rules
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists automation_runs_select_member on public.automation_runs;
create policy automation_runs_select_member
on public.automation_runs
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists automation_runs_manage_admin on public.automation_runs;
create policy automation_runs_manage_admin
on public.automation_runs
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

create or replace function public.enqueue_automation_run(
  _club_id uuid,
  _rule_type text,
  _payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_id uuid;
  v_run_id uuid;
begin
  if not public.is_member_of_club(auth.uid(), _club_id) then
    raise exception 'Not authorized';
  end if;

  select id into v_rule_id
  from public.automation_rules
  where club_id = _club_id and rule_type = _rule_type and is_enabled = true
  limit 1;

  if v_rule_id is null then
    raise exception 'No enabled rule for type %', _rule_type;
  end if;

  insert into public.automation_runs (club_id, rule_id, run_type, result)
  values (_club_id, v_rule_id, _rule_type, _payload)
  returning id into v_run_id;

  update public.automation_rules set last_run_at = now(), updated_at = now() where id = v_rule_id;
  return v_run_id;
end;
$$;
