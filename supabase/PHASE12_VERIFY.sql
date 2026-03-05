-- Phase 12 verification block
-- Run after applying Phase 12 incremental migrations in a target environment.
-- Expected result: every check returns ok=true.

with required_tables as (
  select unnest(array[
    'public.club_member_drafts',
    'public.request_rate_limits',
    'public.abuse_alerts'
  ]) as table_name
),
table_checks as (
  select
    'table_exists'::text as check_type,
    rt.table_name as check_name,
    exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where (n.nspname || '.' || c.relname) = rt.table_name
    ) as ok
  from required_tables rt
),
required_columns as (
  select * from (values
    ('public.clubs', 'join_approval_mode'),
    ('public.clubs', 'join_reviewer_policy'),
    ('public.clubs', 'join_default_role'),
    ('public.clubs', 'join_default_team'),
    ('public.club_invite_requests', 'request_user_id')
  ) as t(table_name, column_name)
),
column_checks as (
  select
    'column_exists'::text as check_type,
    rc.table_name || '.' || rc.column_name as check_name,
    exists (
      select 1
      from information_schema.columns c
      where (c.table_schema || '.' || c.table_name) = rc.table_name
        and c.column_name = rc.column_name
    ) as ok
  from required_columns rc
),
required_functions as (
  select unnest(array[
    'public.can_review_club_join_requests',
    'public.register_club_join_request',
    'public.approve_club_join_request',
    'public.enforce_request_rate_limit',
    'public.get_club_request_abuse_audit',
    'public.raise_abuse_alert',
    'public.get_club_abuse_alerts',
    'public.resolve_club_abuse_alert'
  ]) as function_name
),
function_checks as (
  select
    'function_exists'::text as check_type,
    rf.function_name as check_name,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where (n.nspname || '.' || p.proname) = rf.function_name
    ) as ok
  from required_functions rf
),
required_policies as (
  select * from (values
    ('public.club_invite_requests', 'club_invite_requests_select_admin'),
    ('public.club_invite_requests', 'club_invite_requests_update_admin'),
    ('public.club_invites', 'club_invites_select_reviewer'),
    ('public.club_invites', 'club_invites_insert_reviewer'),
    ('public.club_invites', 'club_invites_update_reviewer'),
    ('public.club_invites', 'club_invites_delete_reviewer'),
    ('public.abuse_alerts', 'abuse_alerts_select_reviewer'),
    ('public.abuse_alerts', 'abuse_alerts_update_reviewer')
  ) as t(table_name, policy_name)
),
policy_checks as (
  select
    'policy_exists'::text as check_type,
    rp.table_name || ':' || rp.policy_name as check_name,
    exists (
      select 1
      from pg_policies p
      where (p.schemaname || '.' || p.tablename) = rp.table_name
        and p.policyname = rp.policy_name
    ) as ok
  from required_policies rp
)
select * from table_checks
union all
select * from column_checks
union all
select * from function_checks
union all
select * from policy_checks
order by check_type, check_name;

