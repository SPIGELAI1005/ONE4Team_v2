-- Operator-facing aggregate view of the Marketplace & Partners ecosystem.
-- Security-definer + platform permission so RLS-scoped marketplace/partner
-- tables can be summarized safely for the Control Center. No PII in payloads.

create or replace function public.get_operator_marketplace_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  perform public.require_platform_permission('operator.analytics.read');

  select jsonb_build_object(
    'generated_at', now(),
    'providers', jsonb_build_object(
      'total', (select count(*)::int from public.marketplace_provider_profiles),
      'active', (select count(*)::int from public.marketplace_provider_profiles where listing_status = 'active'),
      'pending_review', (select count(*)::int from public.marketplace_provider_profiles where listing_status = 'submitted_for_review'),
      'verified', (select count(*)::int from public.marketplace_provider_profiles where verification_status = 'verified'),
      'featured', (select count(*)::int from public.marketplace_provider_profiles where is_featured),
      'by_status', coalesce((
        select jsonb_agg(jsonb_build_object('key', listing_status, 'count', c) order by c desc)
        from (
          select listing_status, count(*)::int as c
          from public.marketplace_provider_profiles
          group by listing_status
        ) s
      ), '[]'::jsonb),
      'by_type', coalesce((
        select jsonb_agg(jsonb_build_object('key', provider_type, 'count', c) order by c desc)
        from (
          select provider_type, count(*)::int as c
          from public.marketplace_provider_profiles
          group by provider_type
        ) s
      ), '[]'::jsonb)
    ),
    'requests', jsonb_build_object(
      'total', (select count(*)::int from public.marketplace_requests),
      'open', (select count(*)::int from public.marketplace_requests where status = 'open'),
      'budget_min_total', (select coalesce(sum(budget_min), 0) from public.marketplace_requests),
      'budget_max_total', (select coalesce(sum(budget_max), 0) from public.marketplace_requests),
      'by_status', coalesce((
        select jsonb_agg(jsonb_build_object('key', status, 'count', c) order by c desc)
        from (
          select status, count(*)::int as c
          from public.marketplace_requests
          group by status
        ) s
      ), '[]'::jsonb),
      'by_category', coalesce((
        select jsonb_agg(jsonb_build_object('key', category, 'count', c) order by c desc)
        from (
          select category, count(*)::int as c
          from public.marketplace_requests
          where category is not null and length(trim(category)) > 0
          group by category
          order by c desc
          limit 8
        ) s
      ), '[]'::jsonb)
    ),
    'offers', jsonb_build_object(
      'total', (select count(*)::int from public.marketplace_offers),
      'accepted', (select count(*)::int from public.marketplace_offers where status = 'accepted'),
      'by_status', coalesce((
        select jsonb_agg(jsonb_build_object('key', status, 'count', c) order by c desc)
        from (
          select status, count(*)::int as c
          from public.marketplace_offers
          group by status
        ) s
      ), '[]'::jsonb)
    ),
    'partners', jsonb_build_object(
      'total', (select count(*)::int from public.partners),
      'marketplace_sourced', (select count(*)::int from public.partners where marketplace_source),
      'clubs_with_partners', (select count(distinct club_id)::int from public.partners),
      'by_type', coalesce((
        select jsonb_agg(jsonb_build_object('key', partner_type, 'count', c) order by c desc)
        from (
          select partner_type, count(*)::int as c
          from public.partners
          group by partner_type
        ) s
      ), '[]'::jsonb)
    ),
    'contracts', jsonb_build_object(
      'total', (select count(*)::int from public.partner_contracts),
      'active', (select count(*)::int from public.partner_contracts where contract_status = 'active'),
      'total_value_eur', (select coalesce(sum(value_eur), 0) from public.partner_contracts),
      'active_value_eur', (select coalesce(sum(value_eur), 0) from public.partner_contracts where contract_status = 'active'),
      'by_status', coalesce((
        select jsonb_agg(jsonb_build_object('key', contract_status, 'count', c) order by c desc)
        from (
          select contract_status, count(*)::int as c
          from public.partner_contracts
          group by contract_status
        ) s
      ), '[]'::jsonb)
    ),
    'invoices', jsonb_build_object(
      'total', (select count(*)::int from public.partner_invoices),
      'paid_value_eur', (select coalesce(sum(amount_eur), 0) from public.partner_invoices where invoice_status = 'paid'),
      'outstanding_value_eur', (select coalesce(sum(amount_eur), 0) from public.partner_invoices where invoice_status in ('pending', 'overdue')),
      'overdue_count', (select count(*)::int from public.partner_invoices where invoice_status = 'overdue')
    ),
    'engagements', jsonb_build_object(
      'total', (select count(*)::int from public.partner_tasks),
      'open', (select count(*)::int from public.partner_tasks where task_status in ('open', 'in_progress')),
      'by_category', coalesce((
        select jsonb_agg(jsonb_build_object('key', engagement_category, 'count', c) order by c desc)
        from (
          select engagement_category, count(*)::int as c
          from public.partner_tasks
          group by engagement_category
        ) s
      ), '[]'::jsonb)
    ),
    'top_providers', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.clubs_reached desc, ranked.saved_count desc, ranked.accepted_offers desc)
      from (
        select
          p.id,
          p.provider_name as name,
          p.provider_type,
          p.listing_status,
          p.verification_status,
          (select count(*)::int from public.marketplace_saved_providers sp where sp.provider_profile_id = p.id) as saved_count,
          (select count(*)::int from public.marketplace_offers mo where mo.provider_profile_id = p.id and mo.status = 'accepted') as accepted_offers,
          (
            select count(distinct mr.club_id)::int
            from public.marketplace_offers mo
            join public.marketplace_requests mr on mr.id = mo.request_id
            where mo.provider_profile_id = p.id and mo.status = 'accepted'
          ) as clubs_reached
        from public.marketplace_provider_profiles p
        order by clubs_reached desc, saved_count desc, accepted_offers desc
        limit 10
      ) ranked
    ), '[]'::jsonb),
    'top_categories', coalesce((
      select jsonb_agg(jsonb_build_object('key', cat, 'count', c) order by c desc)
      from (
        select unnest(categories) as cat, count(*)::int as c
        from public.marketplace_provider_profiles
        group by cat
        order by c desc
        limit 12
      ) s
    ), '[]'::jsonb),
    'recent_requests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', mr.id,
          'title', mr.title,
          'category', mr.category,
          'status', mr.status,
          'club_name', c.name,
          'budget_min', mr.budget_min,
          'budget_max', mr.budget_max,
          'provider_type_wanted', mr.provider_type_wanted,
          'created_at', mr.created_at
        )
        order by mr.created_at desc
      )
      from (
        select * from public.marketplace_requests order by created_at desc limit 8
      ) mr
      left join public.clubs c on c.id = mr.club_id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_operator_marketplace_overview() from public;
grant execute on function public.get_operator_marketplace_overview() to authenticated;
