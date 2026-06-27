-- Club-wide operational tasks (assignable to members or external partners).

create table if not exists public.club_tasks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  team_id uuid references public.teams(id) on delete set null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'ai_agent', 'event', 'partner')),
  source_id uuid,
  created_by uuid not null default auth.uid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_tasks_club_status_idx
  on public.club_tasks(club_id, status, due_at);
create index if not exists club_tasks_assignee_idx
  on public.club_tasks(club_id, assignee_user_id)
  where assignee_user_id is not null;

drop trigger if exists update_club_tasks_updated_at on public.club_tasks;
create trigger update_club_tasks_updated_at
  before update on public.club_tasks
  for each row execute function public.update_updated_at();

alter table public.club_tasks enable row level security;

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

drop policy if exists "Staff can create club tasks" on public.club_tasks;
create policy "Staff can create club tasks"
  on public.club_tasks for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
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
    )
  );

drop policy if exists "Assignees can update own club tasks" on public.club_tasks;
create policy "Assignees can update own club tasks"
  on public.club_tasks for update to authenticated
  using (
    assignee_user_id = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
  )
  with check (
    assignee_user_id = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
  );

drop policy if exists "Staff can manage club tasks" on public.club_tasks;
create policy "Staff can manage club tasks"
  on public.club_tasks for update to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = club_tasks.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
    )
  )
  with check (
    public.is_club_admin(auth.uid(), club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = club_tasks.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
    )
  );

drop policy if exists "Admins can delete club tasks" on public.club_tasks;
create policy "Admins can delete club tasks"
  on public.club_tasks for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create or replace function public.fanout_task_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_user_id is null then
    return new;
  end if;
  if new.status not in ('open', 'in_progress') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.assignee_user_id is not distinct from new.assignee_user_id then
    return new;
  end if;

  insert into public.notifications (club_id, user_id, title, body, notification_type, reference_id, is_read)
  values (
    new.club_id,
    new.assignee_user_id,
    new.title,
    left(coalesce(new.description, ''), 240),
    'task',
    new.id,
    new.assignee_user_id = new.created_by
  );

  return new;
end;
$$;

drop trigger if exists trg_fanout_task_notifications on public.club_tasks;
create trigger trg_fanout_task_notifications
  after insert or update of assignee_user_id on public.club_tasks
  for each row
  execute function public.fanout_task_notifications();

create or replace function public.cleanup_task_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where notification_type = 'task'
    and reference_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_task_notifications on public.club_tasks;
create trigger trg_cleanup_task_notifications
  before delete on public.club_tasks
  for each row
  execute function public.cleanup_task_notifications();

notify pgrst, 'reload schema';
