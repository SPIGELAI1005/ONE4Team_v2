-- Coach placeholders allow assigning coaches without auth accounts (no emails yet).

create table if not exists public.club_person_placeholders (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  kind text not null check (kind in ('coach')),
  display_name text not null,
  notes text,
  resolved_membership_id uuid references public.club_memberships(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, kind, display_name)
);

create index if not exists idx_club_person_placeholders_club_id on public.club_person_placeholders(club_id);
create index if not exists idx_club_person_placeholders_resolved_membership_id on public.club_person_placeholders(resolved_membership_id);

alter table public.club_person_placeholders enable row level security;

drop policy if exists club_person_placeholders_select_member on public.club_person_placeholders;
create policy club_person_placeholders_select_member
on public.club_person_placeholders
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_person_placeholders_manage_trainer on public.club_person_placeholders;
create policy club_person_placeholders_manage_trainer
on public.club_person_placeholders
for all
to authenticated
using (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = club_person_placeholders.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = club_person_placeholders.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
);

drop trigger if exists update_club_person_placeholders_updated_at on public.club_person_placeholders;
create trigger update_club_person_placeholders_updated_at
before update on public.club_person_placeholders
for each row execute function public.update_updated_at();

-- Extend team_coaches: allow referencing either a membership or a placeholder.
alter table public.team_coaches
  add column if not exists placeholder_id uuid references public.club_person_placeholders(id) on delete cascade;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_coaches'
      and column_name = 'membership_id'
      and is_nullable = 'NO'
  ) then
    alter table public.team_coaches alter column membership_id drop not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'team_coaches'
      and c.conname = 'team_coaches_exactly_one_subject'
  ) then
    alter table public.team_coaches
      add constraint team_coaches_exactly_one_subject
      check (
        (membership_id is not null and placeholder_id is null)
        or
        (membership_id is null and placeholder_id is not null)
      );
  end if;
end $$;

create index if not exists idx_team_coaches_placeholder_id on public.team_coaches(placeholder_id);

-- ON CONFLICT needs a non-partial unique constraint/index match.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'team_coaches'
      and c.conname = 'team_coaches_team_placeholder_uniq'
  ) then
    alter table public.team_coaches
      add constraint team_coaches_team_placeholder_uniq unique (team_id, placeholder_id);
  end if;
end $$;

