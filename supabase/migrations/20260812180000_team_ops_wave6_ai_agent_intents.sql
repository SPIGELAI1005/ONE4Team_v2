-- Wave 6 Team Operations: AI 4 T agent RPCs for attendance/duty/checklist/poll intents.
-- Summaries are read-only. Reminders are never sent from agent propose/execute
-- (draft text only; use Activities Remind / Communication for real delivery).

-- ---------------------------------------------------------------------------
-- 1) Summarize missing RSVPs for one activity
-- ---------------------------------------------------------------------------
create or replace function public.agent_summarize_missing_attendance(
  _club_id uuid,
  _user_id uuid,
  _activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act public.activities%rowtype;
  v_eligible uuid[];
  v_missing jsonb := '[]'::jsonb;
  v_row record;
  v_responded int := 0;
  v_eligible_count int := 0;
begin
  if _user_id is null or not (
    public.is_club_admin(_user_id, _club_id)
    or public.is_club_trainer(_user_id, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_act from public.activities where id = _activity_id and club_id = _club_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_act.type not in ('training', 'match') then
    return jsonb_build_object('ok', false, 'error', 'unsupported_type');
  end if;

  if v_act.team_id is not null then
    select coalesce(array_agg(tp.membership_id), array[]::uuid[])
    into v_eligible
    from public.team_players tp
    join public.club_memberships cm on cm.id = tp.membership_id
    where tp.team_id = v_act.team_id
      and cm.club_id = _club_id
      and cm.status = 'active';
  else
    select coalesce(array_agg(cm.id), array[]::uuid[])
    into v_eligible
    from public.club_memberships cm
    where cm.club_id = _club_id
      and cm.status = 'active'
      and cm.role::text in ('player', 'member');
  end if;

  v_eligible_count := coalesce(cardinality(v_eligible), 0);

  for v_row in
    select
      cm.id as membership_id,
      coalesce(nullif(trim(p.display_name), ''), cm.id::text) as display_name,
      aa.status
    from unnest(v_eligible) as e(membership_id)
    join public.club_memberships cm on cm.id = e.membership_id
    left join public.profiles p on p.user_id = cm.user_id
    left join public.activity_attendance aa
      on aa.activity_id = v_act.id and aa.membership_id = cm.id
  loop
    if v_row.status in ('confirmed', 'declined', 'attended', 'maybe') then
      v_responded := v_responded + 1;
    else
      v_missing := v_missing || jsonb_build_array(
        jsonb_build_object(
          'membership_id', v_row.membership_id,
          'display_name', v_row.display_name,
          'status', coalesce(v_row.status, 'invited')
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'activity_id', v_act.id,
    'activity_title', v_act.title,
    'starts_at', v_act.starts_at,
    'team_id', v_act.team_id,
    'eligible_count', v_eligible_count,
    'responded_count', v_responded,
    'missing_count', jsonb_array_length(v_missing),
    'missing', v_missing
  );
end;
$$;

revoke all on function public.agent_summarize_missing_attendance(uuid, uuid, uuid) from public;
grant execute on function public.agent_summarize_missing_attendance(uuid, uuid, uuid) to authenticated;
grant execute on function public.agent_summarize_missing_attendance(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2) Attendance metrics window (read-only)
-- ---------------------------------------------------------------------------
create or replace function public.agent_summarize_attendance_metrics(
  _club_id uuid,
  _user_id uuid,
  _team_id uuid default null,
  _days integer default 28
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(_days, 28), 90)));
  v_acts int := 0;
  v_gaps int := 0;
  v_missing_total int := 0;
  v_response_sum numeric := 0;
  v_coming_sum numeric := 0;
  v_rated int := 0;
  v_act record;
  v_summary jsonb;
  v_eligible int;
  v_responded int;
  v_missing int;
  v_coming int;
begin
  if _user_id is null or not (
    public.is_club_admin(_user_id, _club_id)
    or public.is_club_trainer(_user_id, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  for v_act in
    select a.id
    from public.activities a
    where a.club_id = _club_id
      and a.type in ('training', 'match')
      and a.starts_at >= v_from
      and a.starts_at < now()
      and (_team_id is null or a.team_id = _team_id)
    order by a.starts_at
    limit 80
  loop
    v_summary := public.agent_summarize_missing_attendance(_club_id, _user_id, v_act.id);
    if coalesce((v_summary->>'ok')::boolean, false) is not true then
      continue;
    end if;
    v_acts := v_acts + 1;
    v_eligible := coalesce((v_summary->>'eligible_count')::int, 0);
    v_responded := coalesce((v_summary->>'responded_count')::int, 0);
    v_missing := coalesce((v_summary->>'missing_count')::int, 0);

    select count(*)::int into v_coming
    from public.activity_attendance aa
    where aa.activity_id = v_act.id
      and aa.status in ('confirmed', 'attended');

    v_missing_total := v_missing_total + v_missing;
    if v_missing > 0 then
      v_gaps := v_gaps + 1;
    end if;
    if v_eligible > 0 then
      v_rated := v_rated + 1;
      v_response_sum := v_response_sum + (v_responded::numeric / v_eligible::numeric);
      v_coming_sum := v_coming_sum + (v_coming::numeric / v_eligible::numeric);
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'days', greatest(1, least(coalesce(_days, 28), 90)),
    'team_id', _team_id,
    'activities_in_window', v_acts,
    'avg_response_rate', case when v_rated > 0 then round(v_response_sum / v_rated, 3) else null end,
    'avg_coming_rate', case when v_rated > 0 then round(v_coming_sum / v_rated, 3) else null end,
    'total_missing', v_missing_total,
    'rsvp_gap_activities', v_gaps
  );
end;
$$;

revoke all on function public.agent_summarize_attendance_metrics(uuid, uuid, uuid, integer) from public;
grant execute on function public.agent_summarize_attendance_metrics(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.agent_summarize_attendance_metrics(uuid, uuid, uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Create claimable duty (+ optional checklist titles)
-- ---------------------------------------------------------------------------
create or replace function public.agent_create_claimable_duty(
  _club_id uuid,
  _user_id uuid,
  _title text,
  _description text default null,
  _team_id uuid default null,
  _activity_id uuid default null,
  _due_at timestamptz default null,
  _checklist_titles text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
  v_title text;
  v_ord int := 0;
begin
  if _user_id is null or not (
    public.is_club_admin(_user_id, _club_id)
    or public.is_club_trainer(_user_id, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_title := nullif(trim(coalesce(_title, '')), '');
  if v_title is null then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;

  if _team_id is not null and not exists (
    select 1 from public.teams t where t.id = _team_id and t.club_id = _club_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_team');
  end if;

  if _activity_id is not null and not exists (
    select 1 from public.activities a where a.id = _activity_id and a.club_id = _club_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_activity');
  end if;

  insert into public.club_tasks (
    club_id, title, description, status, priority, due_at, team_id,
    assignee_user_id, source_type, activity_id, claimable, slots_filled, created_by
  ) values (
    _club_id, v_title, nullif(trim(coalesce(_description, '')), ''), 'open', 'normal',
    _due_at, _team_id, null, 'duty', _activity_id, true, 0, _user_id
  )
  returning id into v_task_id;

  if _checklist_titles is not null then
    foreach v_title in array _checklist_titles loop
      if nullif(trim(v_title), '') is null then
        continue;
      end if;
      insert into public.club_task_checklist_items (club_id, task_id, title, sort_order)
      values (_club_id, v_task_id, trim(v_title), v_ord);
      v_ord := v_ord + 1;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'task_id', v_task_id, 'checklist_count', v_ord);
end;
$$;

revoke all on function public.agent_create_claimable_duty(uuid, uuid, text, text, uuid, uuid, timestamptz, text[]) from public;
grant execute on function public.agent_create_claimable_duty(uuid, uuid, text, text, uuid, uuid, timestamptz, text[]) to authenticated;
grant execute on function public.agent_create_claimable_duty(uuid, uuid, text, text, uuid, uuid, timestamptz, text[]) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Create checklist on existing or new task for an activity
-- ---------------------------------------------------------------------------
create or replace function public.agent_create_activity_checklist(
  _club_id uuid,
  _user_id uuid,
  _titles text[],
  _task_id uuid default null,
  _activity_id uuid default null,
  _team_id uuid default null,
  _task_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid := _task_id;
  v_title text;
  v_ord int := 0;
  v_count int := 0;
begin
  if _user_id is null or not (
    public.is_club_admin(_user_id, _club_id)
    or public.is_club_trainer(_user_id, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if _titles is null or cardinality(_titles) < 1 then
    return jsonb_build_object('ok', false, 'error', 'titles_required');
  end if;

  if v_task_id is null then
    insert into public.club_tasks (
      club_id, title, description, status, priority, team_id,
      source_type, activity_id, claimable, created_by
    ) values (
      _club_id,
      coalesce(nullif(trim(coalesce(_task_title, '')), ''), 'Activity checklist'),
      null, 'open', 'normal', _team_id, 'checklist', _activity_id, false, _user_id
    )
    returning id into v_task_id;
  else
    if not exists (
      select 1 from public.club_tasks t where t.id = v_task_id and t.club_id = _club_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'task_not_found');
    end if;
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_ord
  from public.club_task_checklist_items
  where task_id = v_task_id;

  foreach v_title in array _titles loop
    if nullif(trim(v_title), '') is null then
      continue;
    end if;
    insert into public.club_task_checklist_items (club_id, task_id, title, sort_order)
    values (_club_id, v_task_id, trim(v_title), v_ord);
    v_ord := v_ord + 1;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'task_id', v_task_id, 'checklist_count', v_count);
end;
$$;

revoke all on function public.agent_create_activity_checklist(uuid, uuid, text[], uuid, uuid, uuid, text) from public;
grant execute on function public.agent_create_activity_checklist(uuid, uuid, text[], uuid, uuid, uuid, text) to authenticated;
grant execute on function public.agent_create_activity_checklist(uuid, uuid, text[], uuid, uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5) Create poll on confirm (explicit execute — never from propose alone)
-- ---------------------------------------------------------------------------
create or replace function public.agent_create_club_poll(
  _club_id uuid,
  _user_id uuid,
  _title text,
  _options text[],
  _description text default null,
  _team_id uuid default null,
  _allow_multi boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if _user_id is null or not (
    public.is_club_admin(_user_id, _club_id)
    or public.is_club_trainer(_user_id, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Reuse create_club_poll which fans out notifications — only called on Confirm.
  return public.create_club_poll(
    _club_id,
    _title,
    _description,
    _team_id,
    coalesce(_allow_multi, false),
    null,
    _options
  );
end;
$$;

revoke all on function public.agent_create_club_poll(uuid, uuid, text, text[], text, uuid, boolean) from public;
grant execute on function public.agent_create_club_poll(uuid, uuid, text, text[], text, uuid, boolean) to authenticated;
grant execute on function public.agent_create_club_poll(uuid, uuid, text, text[], text, uuid, boolean) to service_role;
