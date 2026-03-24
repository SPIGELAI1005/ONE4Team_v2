-- Option 2: multiple scoped role assignments per membership (club | team | self).
-- Keeps club_memberships.role as legacy primary label; assignments drive extended RBAC.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Scope enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'club_role_scope') then
    create type public.club_role_scope as enum ('club', 'team', 'self');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2) Assignments table
-- ---------------------------------------------------------------------------
create table if not exists public.club_role_assignments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  role_kind text not null,
  scope public.club_role_scope not null,
  scope_team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint club_role_assignments_role_kind_check check (
    role_kind in (
      'club_admin',
      'team_admin',
      'trainer',
      'player',
      'player_teen',
      'player_adult',
      'parent',
      'staff',
      'member',
      'sponsor',
      'supplier',
      'service_provider',
      'consultant'
    )
  ),
  constraint club_role_assignments_scope_consistency check (
    (scope = 'club' and scope_team_id is null)
    or (scope = 'self' and scope_team_id is null)
    or (scope = 'team' and scope_team_id is not null)
  )
);

-- Uniqueness: one row per (membership, role_kind, scope[, team])
create unique index if not exists idx_club_role_assignments_unique_club_self
  on public.club_role_assignments (membership_id, role_kind, scope)
  where scope in ('club', 'self');

create unique index if not exists idx_club_role_assignments_unique_team
  on public.club_role_assignments (membership_id, role_kind, scope, scope_team_id)
  where scope = 'team';

create index if not exists idx_club_role_assignments_club on public.club_role_assignments(club_id);
create index if not exists idx_club_role_assignments_membership on public.club_role_assignments(membership_id);
create index if not exists idx_club_role_assignments_team on public.club_role_assignments(scope_team_id);

-- Legacy-only admin check (must exist before RLS policies on this table)
create or replace function public.is_club_admin_membership_legacy(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.user_id = _user_id
      and cm.club_id = _club_id
      and cm.status = 'active'
      and cm.role = 'admin'
  );
$$;

grant execute on function public.is_club_admin_membership_legacy(uuid, uuid) to authenticated;

alter table public.club_role_assignments enable row level security;

drop policy if exists club_role_assignments_select_members on public.club_role_assignments;
create policy club_role_assignments_select_members
  on public.club_role_assignments for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_role_assignments_admin_write on public.club_role_assignments;
create policy club_role_assignments_admin_write
  on public.club_role_assignments for all to authenticated
  using (public.is_club_admin_membership_legacy(auth.uid(), club_id))
  with check (public.is_club_admin_membership_legacy(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- 3) Backfill from club_memberships (club-scoped)
-- ---------------------------------------------------------------------------
insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
select
  cm.club_id,
  cm.id,
  case cm.role::text
    when 'admin' then 'club_admin'
    else cm.role::text
  end,
  'club'::public.club_role_scope,
  null
from public.club_memberships cm
where cm.status = 'active'
  and not exists (
    select 1
    from public.club_role_assignments x
    where x.membership_id = cm.id
      and x.role_kind = case cm.role::text when 'admin' then 'club_admin' else cm.role::text end
      and x.scope = 'club'
  );

-- ---------------------------------------------------------------------------
-- 5) Team-scoped trainers from team_coaches
-- ---------------------------------------------------------------------------
insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
select
  t.club_id,
  tc.membership_id,
  'trainer',
  'team'::public.club_role_scope,
  tc.team_id
from public.team_coaches tc
join public.teams t on t.id = tc.team_id
join public.club_memberships cm on cm.id = tc.membership_id and cm.club_id = t.club_id
where not exists (
  select 1
  from public.club_role_assignments x
  where x.membership_id = tc.membership_id
    and x.role_kind = 'trainer'
    and x.scope = 'team'
    and x.scope_team_id = tc.team_id
);

-- ---------------------------------------------------------------------------
-- 6) Team-scoped players from team_players (when table exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'team_players'
  ) then
    insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
    select
      t.club_id,
      tp.membership_id,
      'player',
      'team'::public.club_role_scope,
      tp.team_id
    from public.team_players tp
    join public.teams t on t.id = tp.team_id
    join public.club_memberships cm on cm.id = tp.membership_id and cm.club_id = t.club_id
    where cm.role::text = 'player'
      and not exists (
        select 1
        from public.club_role_assignments x
        where x.membership_id = tp.membership_id
          and x.role_kind = 'player'
          and x.scope = 'team'
          and x.scope_team_id = tp.team_id
      );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 7) Replace is_club_admin / is_club_trainer to honor assignments
-- ---------------------------------------------------------------------------
create or replace function public.is_club_admin(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.user_id = _user_id
      and cm.club_id = _club_id
      and cm.status = 'active'
      and (
        cm.role = 'admin'
        or exists (
          select 1
          from public.club_role_assignments cra
          where cra.membership_id = cm.id
            and cra.role_kind = 'club_admin'
            and cra.scope = 'club'
        )
      )
  );
$$;

create or replace function public.is_club_trainer(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.user_id = _user_id
      and cm.club_id = _club_id
      and cm.status = 'active'
      and (
        cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
        or exists (
          select 1
          from public.club_role_assignments cra
          where cra.membership_id = cm.id
            and cra.club_id = _club_id
            and (
              (cra.role_kind = 'club_admin' and cra.scope = 'club')
              or (cra.role_kind = 'trainer' and cra.scope = 'club')
              or (cra.role_kind = 'trainer' and cra.scope = 'team')
            )
        )
      )
  );
$$;

-- Team-level admin (for future RLS): roster managers
create or replace function public.is_team_admin_user(_user_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_role_assignments cra
    join public.club_memberships cm on cm.id = cra.membership_id
    join public.teams t on t.id = _team_id and t.club_id = cm.club_id
    where cm.user_id = _user_id
      and cm.status = 'active'
      and cra.scope = 'team'
      and cra.scope_team_id = _team_id
      and cra.role_kind = 'team_admin'
  );
$$;

grant execute on function public.is_team_admin_user(uuid, uuid) to authenticated;

grant execute on function public.is_club_trainer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) New memberships: ensure one club-scoped assignment (keeps Option 2 in sync)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_club_role_assignment_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text;
begin
  kind := case new.role::text when 'admin' then 'club_admin' else new.role::text end;
  if not exists (
    select 1
    from public.club_role_assignments cra
    where cra.membership_id = new.id
      and cra.role_kind = kind
      and cra.scope = 'club'
  ) then
    insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
    values (new.club_id, new.id, kind, 'club', null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_club_memberships_ensure_assignment on public.club_memberships;
create trigger trg_club_memberships_ensure_assignment
  after insert on public.club_memberships
  for each row execute function public.ensure_club_role_assignment_row();
