-- Runtime entitlements for club members (Operator overrides must affect PlanGate).
-- Complements 20260804120000_pricing_founding_club_offers.sql

-- Members may read their own club's module entitlement overrides (enabled rows only).
drop policy if exists club_module_entitlements_select_member on public.club_module_entitlements;
create policy club_module_entitlements_select_member
on public.club_module_entitlements
for select to authenticated
using (
  public.is_member_of_club(auth.uid(), club_id)
  and enabled = true
  and (valid_until is null or valid_until > now())
);

create or replace function public.get_my_club_module_overrides(_club_id uuid)
returns table (
  module_key text,
  enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_member_of_club(auth.uid(), _club_id)
     and not public.can_view_platform() then
    raise exception 'Not a member of this club';
  end if;

  return query
  select m.key::text as module_key, cme.enabled
  from public.club_module_entitlements cme
  join public.modules m on m.id = cme.module_id
  where cme.club_id = _club_id
    and cme.enabled = true
    and (cme.valid_until is null or cme.valid_until > now());
end;
$$;

revoke all on function public.get_my_club_module_overrides(uuid) from public;
grant execute on function public.get_my_club_module_overrides(uuid) to authenticated;

-- Operator helpers: pause/activate commercial offers
create or replace function public.set_commercial_offer_status(
  _offer_code text,
  _status text,
  _reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.commercial_offers%rowtype;
begin
  if not (public.require_platform_permission('operator.plans.manage') ->> 'is_platform_user')::boolean then
    raise exception 'Operator permission required';
  end if;
  if _status not in ('draft', 'active', 'paused', 'closed') then
    raise exception 'Invalid status';
  end if;

  update public.commercial_offers
  set
    status = _status,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_status_change_reason', coalesce(_reason, ''),
      'last_status_changed_at', now()
    ),
    updated_at = now()
  where code = _offer_code
  returning * into v_offer;

  if not found then
    raise exception 'Offer not found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', v_offer.code,
    'status', v_offer.status
  );
end;
$$;

revoke all on function public.set_commercial_offer_status(text, text, text) from public;
grant execute on function public.set_commercial_offer_status(text, text, text) to authenticated;
