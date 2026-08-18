-- Wave 7 Team Operations: Realtime publication for ops tables + ICS access touch helper.
-- Calendar feed itself is served by Edge function `calendar-ics` (opaque token → hash lookup).

-- ---------------------------------------------------------------------------
-- 1) Idempotent Realtime publication (selective; never calendar_subscriptions / finance)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'club_tasks',
    'activity_attendance',
    'club_polls',
    'club_poll_votes',
    'activity_transport_offers'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_publication p on p.oid = pr.prpubid
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Service-role helper: resolve subscription by token hash + bump last_accessed_at
-- ---------------------------------------------------------------------------
create or replace function public.resolve_calendar_subscription_for_ics(
  _token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.calendar_subscriptions%rowtype;
  v_club_name text;
begin
  if _token_hash is null or length(trim(_token_hash)) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_sub
  from public.calendar_subscriptions
  where token_hash = trim(_token_hash)
    and revoked_at is null
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.calendar_subscriptions
  set last_accessed_at = now()
  where id = v_sub.id;

  select c.name into v_club_name from public.clubs c where c.id = v_sub.club_id;

  return jsonb_build_object(
    'ok', true,
    'subscription_id', v_sub.id,
    'club_id', v_sub.club_id,
    'club_name', coalesce(v_club_name, 'ONE4Team'),
    'membership_id', v_sub.membership_id,
    'scope', v_sub.scope,
    'team_id', v_sub.team_id,
    'label', v_sub.label
  );
end;
$$;

revoke all on function public.resolve_calendar_subscription_for_ics(text) from public;
-- Edge uses service role only; do not grant to authenticated (prevents hash probing from clients).
grant execute on function public.resolve_calendar_subscription_for_ics(text) to service_role;

comment on function public.resolve_calendar_subscription_for_ics(text) is
  'Wave 7: Edge calendar-ics lookup by SHA-256 hex token hash. Service role only.';
