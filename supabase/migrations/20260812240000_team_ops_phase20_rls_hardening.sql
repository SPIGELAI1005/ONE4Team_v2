-- Phase 20 High hardening (Team Ops close-out)
-- H2: team_ledger_entries writes only via SECURITY DEFINER RPCs (no self-approve via DML)
-- H3: authenticated remind RPC must not return recipient emails

-- ---------------------------------------------------------------------------
-- H2 — Lock ledger entry DML to RPCs (SELECT remains for staff)
-- ---------------------------------------------------------------------------
drop policy if exists "team_ledger_entries_insert" on public.team_ledger_entries;
drop policy if exists "team_ledger_entries_update" on public.team_ledger_entries;
drop policy if exists "team_ledger_entries_delete" on public.team_ledger_entries;

comment on table public.team_ledger_entries is
  'Team cashbox ledger. Mutations only via post_/approve_/reject_/resubmit_ RPCs — no direct authenticated INSERT/UPDATE/DELETE.';

-- ---------------------------------------------------------------------------
-- H3 — Strip recipients (emails) from trainer-facing remind wrapper
-- ---------------------------------------------------------------------------
create or replace function public.remind_missing_activity_attendance(
  _activity_id uuid,
  _reminder_type text default 'manual_missing'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_type text := lower(trim(coalesce(_reminder_type, 'manual_missing')));
  v_result jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_type not in (
    'manual_missing', 'deadline_48h', 'deadline_24h', 'deadline_custom',
    'morning_of', 'starts_24h'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_reminder_type');
  end if;

  if not public.can_manage_activity_attendance(v_uid, _activity_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_result from public.remind_missing_activity_attendance_service(_activity_id, v_type);

  -- Never return recipient PII to the browser; Edge/cron uses the service function.
  if v_result is null then
    return jsonb_build_object('ok', false, 'error', 'empty_result');
  end if;

  return jsonb_build_object(
    'ok', coalesce((v_result->>'ok')::boolean, false),
    'error', v_result->>'error',
    'sent', coalesce((v_result->>'sent')::int, 0),
    'skipped', coalesce((v_result->>'skipped')::int, 0),
    'reminder_type', v_result->>'reminder_type',
    'deadline_key', v_result->>'deadline_key'
  );
end;
$$;

revoke all on function public.remind_missing_activity_attendance(uuid, text) from public;
grant execute on function public.remind_missing_activity_attendance(uuid, text) to authenticated;
