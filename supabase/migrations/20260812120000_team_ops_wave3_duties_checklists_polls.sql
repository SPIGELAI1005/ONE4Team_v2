-- Wave 3 Team Operations: claimable duties + task checklists + club polls (Communication).
-- Extend club_tasks; do not create a parallel duties or RSVP ledger.

-- ---------------------------------------------------------------------------
-- 1) club_tasks: claimable duty fields + activity link
-- ---------------------------------------------------------------------------
alter table public.club_tasks
  add column if not exists claimable boolean not null default false;

alter table public.club_tasks
  add column if not exists slots_total integer;

alter table public.club_tasks
  add column if not exists slots_filled integer not null default 0;

alter table public.club_tasks
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

alter table public.club_tasks
  add column if not exists template_key text;

comment on column public.club_tasks.claimable is
  'When true and unassigned (or slots remain), eligible members may claim via claim_club_task RPC.';
comment on column public.club_tasks.slots_total is
  'Optional multi-slot duty capacity. Null = single assignee claim.';
comment on column public.club_tasks.slots_filled is
  'How many claim slots are taken (0..slots_total).';
comment on column public.club_tasks.activity_id is
  'Optional link to an activity for event-scoped duties/checklists.';
comment on column public.club_tasks.template_key is
  'Optional stamp from club_task_templates.key when spawned from a template.';

alter table public.club_tasks drop constraint if exists club_tasks_slots_check;
alter table public.club_tasks
  add constraint club_tasks_slots_check
  check (
    slots_total is null
    or (slots_total >= 1 and slots_filled >= 0 and slots_filled <= slots_total)
  );

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'club_tasks_source_type_check'
      and conrelid = 'public.club_tasks'::regclass
  ) then
    alter table public.club_tasks drop constraint club_tasks_source_type_check;
  end if;
end $$;

alter table public.club_tasks
  add constraint club_tasks_source_type_check
  check (source_type in ('manual', 'ai_agent', 'event', 'partner', 'duty', 'checklist', 'template'));

create index if not exists club_tasks_claimable_idx
  on public.club_tasks (club_id, claimable)
  where claimable = true and status in ('open', 'in_progress');

create index if not exists club_tasks_activity_idx
  on public.club_tasks (club_id, activity_id)
  where activity_id is not null;

-- Claimable team duties visible to team players even when already partially claimed.
drop policy if exists "Members can view club tasks" on public.club_tasks;
create policy "Members can view club tasks"
  on public.club_tasks for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      assignee_user_id = auth.uid()
      or created_by = auth.uid()
      or public.is_club_admin(auth.uid(), club_id)
      or exists (
        select 1
        from public.club_memberships cm
        where cm.club_id = club_tasks.club_id
          and cm.user_id = auth.uid()
          and cm.status = 'active'
          and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
      )
      or (
        claimable = true
        and status in ('open', 'in_progress')
        and (
          team_id is null
          or exists (
            select 1
            from public.team_players tp
            join public.club_memberships cm on cm.id = tp.membership_id
            where tp.team_id = club_tasks.team_id
              and cm.user_id = auth.uid()
              and cm.club_id = club_tasks.club_id
              and cm.status = 'active'
          )
        )
      )
      or (
        team_id is not null
        and assignee_user_id is null
        and (
          public.is_club_admin(auth.uid(), club_id)
          or exists (
            select 1
            from public.club_memberships cm
            where cm.club_id = club_tasks.club_id
              and cm.user_id = auth.uid()
              and cm.status = 'active'
              and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
          )
          or exists (
            select 1
            from public.team_players tp
            join public.club_memberships cm on cm.id = tp.membership_id
            where tp.team_id = club_tasks.team_id
              and cm.user_id = auth.uid()
              and cm.club_id = club_tasks.club_id
              and cm.status = 'active'
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Checklist items (child of club_tasks — not a second product)
-- ---------------------------------------------------------------------------
create table if not exists public.club_task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  task_id uuid not null references public.club_tasks(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  is_done boolean not null default false,
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_task_checklist_items_task_idx
  on public.club_task_checklist_items (task_id, sort_order);

drop trigger if exists update_club_task_checklist_items_updated_at on public.club_task_checklist_items;
create trigger update_club_task_checklist_items_updated_at
  before update on public.club_task_checklist_items
  for each row execute function public.update_updated_at();

alter table public.club_task_checklist_items enable row level security;

drop policy if exists "checklist_items_select" on public.club_task_checklist_items;
create policy "checklist_items_select"
  on public.club_task_checklist_items for select to authenticated
  using (
    exists (
      select 1 from public.club_tasks t
      where t.id = club_task_checklist_items.task_id
        and t.club_id = club_task_checklist_items.club_id
    )
  );

drop policy if exists "checklist_items_insert_staff" on public.club_task_checklist_items;
create policy "checklist_items_insert_staff"
  on public.club_task_checklist_items for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
    )
  );

drop policy if exists "checklist_items_update_staff_or_assignee" on public.club_task_checklist_items;
create policy "checklist_items_update_staff_or_assignee"
  on public.club_task_checklist_items for update to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
      or exists (
        select 1 from public.club_tasks t
        where t.id = club_task_checklist_items.task_id
          and t.assignee_user_id = auth.uid()
      )
    )
  )
  with check (
    public.is_member_of_club(auth.uid(), club_id)
  );

drop policy if exists "checklist_items_delete_staff" on public.club_task_checklist_items;
create policy "checklist_items_delete_staff"
  on public.club_task_checklist_items for delete to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

-- ---------------------------------------------------------------------------
-- 3) Optional task templates (spawn instances onto club_tasks)
-- ---------------------------------------------------------------------------
create table if not exists public.club_task_templates (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  key text not null,
  name text not null,
  title_template text not null,
  description_template text,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  claimable boolean not null default false,
  checklist_titles jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, key)
);

drop trigger if exists update_club_task_templates_updated_at on public.club_task_templates;
create trigger update_club_task_templates_updated_at
  before update on public.club_task_templates
  for each row execute function public.update_updated_at();

alter table public.club_task_templates enable row level security;

drop policy if exists "task_templates_select_club" on public.club_task_templates;
create policy "task_templates_select_club"
  on public.club_task_templates for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "task_templates_manage_staff" on public.club_task_templates;
create policy "task_templates_manage_staff"
  on public.club_task_templates for all to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

-- ---------------------------------------------------------------------------
-- 4) claim_club_task — race-safe single/multi-slot claim
-- ---------------------------------------------------------------------------
create or replace function public.claim_club_task(_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.club_tasks%rowtype;
  v_slots integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_task
  from public.club_tasks
  where id = _task_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.is_member_of_club(v_uid, v_task.club_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if coalesce(v_task.claimable, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'not_claimable');
  end if;

  if v_task.status not in ('open', 'in_progress') then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  if v_task.team_id is not null and not (
    public.is_club_admin(v_uid, v_task.club_id)
    or public.is_club_trainer(v_uid, v_task.club_id)
    or exists (
      select 1
      from public.team_players tp
      join public.club_memberships cm on cm.id = tp.membership_id
      where tp.team_id = v_task.team_id
        and cm.user_id = v_uid
        and cm.club_id = v_task.club_id
        and cm.status = 'active'
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_on_team');
  end if;

  v_slots := v_task.slots_total;

  if v_slots is null then
    if v_task.assignee_user_id is not null then
      if v_task.assignee_user_id = v_uid then
        return jsonb_build_object('ok', true, 'already', true);
      end if;
      return jsonb_build_object('ok', false, 'error', 'already_claimed');
    end if;

    update public.club_tasks
    set
      assignee_user_id = v_uid,
      slots_filled = 1,
      status = case when status = 'open' then 'in_progress' else status end,
      updated_at = now()
    where id = v_task.id;

    return jsonb_build_object('ok', true, 'assignee_user_id', v_uid, 'slots_filled', 1);
  end if;

  if v_task.slots_filled >= v_slots then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  if v_task.assignee_user_id = v_uid then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  -- Multi-slot MVP: first claimer becomes primary assignee; slots_filled increments.
  update public.club_tasks
  set
    assignee_user_id = coalesce(assignee_user_id, v_uid),
    slots_filled = slots_filled + 1,
    status = case when status = 'open' then 'in_progress' else status end,
    updated_at = now()
  where id = v_task.id
    and slots_filled < slots_total;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  select slots_filled into v_slots from public.club_tasks where id = v_task.id;
  return jsonb_build_object(
    'ok', true,
    'assignee_user_id', coalesce(v_task.assignee_user_id, v_uid),
    'slots_filled', v_slots
  );
end;
$$;

revoke all on function public.claim_club_task(uuid) from public;
grant execute on function public.claim_club_task(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Club polls (Communication domain — not tasks)
-- ---------------------------------------------------------------------------
create table if not exists public.club_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  allow_multi boolean not null default false,
  closes_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists club_polls_club_status_idx
  on public.club_polls (club_id, status, created_at desc);

drop trigger if exists update_club_polls_updated_at on public.club_polls;
create trigger update_club_polls_updated_at
  before update on public.club_polls
  for each row execute function public.update_updated_at();

create table if not exists public.club_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.club_polls(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists club_poll_options_poll_idx
  on public.club_poll_options (poll_id, sort_order);

create table if not exists public.club_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.club_polls(id) on delete cascade,
  option_id uuid not null references public.club_poll_options(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  voter_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_membership_id, option_id)
);

create index if not exists club_poll_votes_poll_idx
  on public.club_poll_votes (poll_id);

alter table public.club_polls enable row level security;
alter table public.club_poll_options enable row level security;
alter table public.club_poll_votes enable row level security;

drop policy if exists "club_polls_select" on public.club_polls;
create policy "club_polls_select"
  on public.club_polls for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      team_id is null
      or public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
      or exists (
        select 1
        from public.team_players tp
        join public.club_memberships cm on cm.id = tp.membership_id
        where tp.team_id = club_polls.team_id
          and cm.user_id = auth.uid()
          and cm.club_id = club_polls.club_id
          and cm.status = 'active'
      )
    )
  );

drop policy if exists "club_polls_insert_staff" on public.club_polls;
create policy "club_polls_insert_staff"
  on public.club_polls for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
    )
  );

drop policy if exists "club_polls_update_staff" on public.club_polls;
create policy "club_polls_update_staff"
  on public.club_polls for update to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

drop policy if exists "club_poll_options_select" on public.club_poll_options;
create policy "club_poll_options_select"
  on public.club_poll_options for select to authenticated
  using (
    exists (
      select 1 from public.club_polls p
      where p.id = club_poll_options.poll_id
        and p.club_id = club_poll_options.club_id
    )
  );

drop policy if exists "club_poll_options_insert_staff" on public.club_poll_options;
create policy "club_poll_options_insert_staff"
  on public.club_poll_options for insert to authenticated
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

drop policy if exists "club_poll_votes_select" on public.club_poll_votes;
create policy "club_poll_votes_select"
  on public.club_poll_votes for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      voter_user_id = auth.uid()
      or public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
    )
  );

-- Votes only via RPC
drop policy if exists "club_poll_votes_no_direct_write" on public.club_poll_votes;
create policy "club_poll_votes_no_direct_write"
  on public.club_poll_votes for insert to authenticated
  with check (false);

create or replace function public.create_club_poll(
  _club_id uuid,
  _title text,
  _description text default null,
  _team_id uuid default null,
  _allow_multi boolean default false,
  _closes_at timestamptz default null,
  _options text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poll_id uuid;
  v_opt text;
  v_ord integer := 0;
  v_options text[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not (
    public.is_club_admin(v_uid, _club_id)
    or public.is_club_trainer(v_uid, _club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if nullif(trim(_title), '') is null then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;

  v_options := coalesce(_options, array[]::text[]);
  if cardinality(v_options) < 2 then
    return jsonb_build_object('ok', false, 'error', 'options_required');
  end if;

  insert into public.club_polls (
    club_id, team_id, title, description, allow_multi, closes_at, created_by
  ) values (
    _club_id, _team_id, trim(_title), nullif(trim(coalesce(_description, '')), ''),
    coalesce(_allow_multi, false), _closes_at, v_uid
  )
  returning id into v_poll_id;

  foreach v_opt in array v_options loop
    if nullif(trim(v_opt), '') is null then
      continue;
    end if;
    insert into public.club_poll_options (poll_id, club_id, label, sort_order)
    values (v_poll_id, _club_id, trim(v_opt), v_ord);
    v_ord := v_ord + 1;
  end loop;

  if v_ord < 2 then
    delete from public.club_polls where id = v_poll_id;
    return jsonb_build_object('ok', false, 'error', 'options_required');
  end if;

  insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id)
  select
    _club_id,
    cm.user_id,
    'New poll',
    left(trim(_title), 120),
    'poll',
    v_poll_id
  from public.club_memberships cm
  where cm.club_id = _club_id
    and cm.status = 'active'
    and cm.user_id is not null
    and cm.user_id <> v_uid
    and (
      _team_id is null
      or exists (
        select 1 from public.team_players tp
        where tp.team_id = _team_id and tp.membership_id = cm.id
      )
    );

  return jsonb_build_object('ok', true, 'poll_id', v_poll_id);
end;
$$;

revoke all on function public.create_club_poll(uuid, text, text, uuid, boolean, timestamptz, text[]) from public;
grant execute on function public.create_club_poll(uuid, text, text, uuid, boolean, timestamptz, text[]) to authenticated;

create or replace function public.vote_club_poll(
  _poll_id uuid,
  _option_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poll public.club_polls%rowtype;
  v_membership_id uuid;
  v_opt uuid;
  v_count integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_poll from public.club_polls where id = _poll_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_poll.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  if v_poll.closes_at is not null and v_poll.closes_at <= now() then
    update public.club_polls
    set status = 'closed', closed_at = coalesce(closed_at, now())
    where id = v_poll.id;
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  if not public.is_member_of_club(v_uid, v_poll.club_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select cm.id into v_membership_id
  from public.club_memberships cm
  where cm.club_id = v_poll.club_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;

  if v_membership_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_membership');
  end if;

  if v_poll.team_id is not null and not (
    public.is_club_admin(v_uid, v_poll.club_id)
    or public.is_club_trainer(v_uid, v_poll.club_id)
    or exists (
      select 1 from public.team_players tp
      where tp.team_id = v_poll.team_id and tp.membership_id = v_membership_id
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_on_team');
  end if;

  if _option_ids is null or cardinality(_option_ids) < 1 then
    return jsonb_build_object('ok', false, 'error', 'options_required');
  end if;

  if not v_poll.allow_multi and cardinality(_option_ids) > 1 then
    return jsonb_build_object('ok', false, 'error', 'single_choice_only');
  end if;

  -- Validate options belong to poll
  if (
    select count(*) from public.club_poll_options o
    where o.poll_id = v_poll.id and o.id = any(_option_ids)
  ) <> cardinality(_option_ids) then
    return jsonb_build_object('ok', false, 'error', 'invalid_option');
  end if;

  delete from public.club_poll_votes
  where poll_id = v_poll.id
    and voter_membership_id = v_membership_id;

  foreach v_opt in array _option_ids loop
    insert into public.club_poll_votes (
      poll_id, option_id, club_id, voter_membership_id, voter_user_id
    ) values (
      v_poll.id, v_opt, v_poll.club_id, v_membership_id, v_uid
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'votes', v_count);
end;
$$;

revoke all on function public.vote_club_poll(uuid, uuid[]) from public;
grant execute on function public.vote_club_poll(uuid, uuid[]) to authenticated;

create or replace function public.close_club_poll(_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poll public.club_polls%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_poll from public.club_polls where id = _poll_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not (
    public.is_club_admin(v_uid, v_poll.club_id)
    or public.is_club_trainer(v_uid, v_poll.club_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.club_polls
  set status = 'closed', closed_at = now(), updated_at = now()
  where id = v_poll.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.close_club_poll(uuid) from public;
grant execute on function public.close_club_poll(uuid) to authenticated;
