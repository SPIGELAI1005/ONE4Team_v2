-- Extended member registry (master data), guardian links, and admin email resolution for imports.

-- ---------------------------------------------------------------------------
-- 1) Master record (one row per membership)
-- ---------------------------------------------------------------------------
create table if not exists public.club_member_master_records (
  membership_id uuid primary key references public.club_memberships(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,

  sex text check (sex is null or sex in ('male', 'female', 'other', 'prefer_not_to_say')),
  first_name text,
  last_name text,
  street_line text,
  address_line2 text,
  postal_code text,
  city text,
  country text,
  birth_date date,
  membership_kind text not null default 'active_participant'
    check (membership_kind in ('active_participant', 'supporting_member')),
  photo_url text,

  bank_account_holder text,
  bank_name text,
  iban text,

  height_cm smallint,
  weight_kg smallint,
  strong_leg text check (strong_leg is null or strong_leg in ('left', 'right', 'both')),
  strong_hand text check (strong_hand is null or strong_hand in ('left', 'right', 'both')),
  shirt_size text,
  shoe_size text,
  jersey_number smallint,
  role_development_notes text,
  strengths text,
  goals_count integer,

  club_registration_date date,
  team_assignment_date date,
  club_exit_date date,
  invoice_reference text,
  player_passport_number text,
  internal_club_number text,
  club_pass_generated_at timestamptz,

  emergency_contact_name text,
  emergency_contact_phone text,
  nationality text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_member_master_records_club_id
  on public.club_member_master_records(club_id);

drop trigger if exists trg_club_member_master_records_updated_at on public.club_member_master_records;
create trigger trg_club_member_master_records_updated_at
  before update on public.club_member_master_records
  for each row execute function public.update_updated_at();

alter table public.club_member_master_records enable row level security;

-- Same club, trainer or admin: roster operations (read)
drop policy if exists "club_member_master_select_staff" on public.club_member_master_records;
create policy "club_member_master_select_staff"
  on public.club_member_master_records for select to authenticated
  using (
    exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = club_member_master_records.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
    )
  );

-- Admins only: write
drop policy if exists "club_member_master_admin_write" on public.club_member_master_records;
create policy "club_member_master_admin_write"
  on public.club_member_master_records for all to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- 2) Guardian / ward links (e.g. parent ↔ child in the same club)
-- ---------------------------------------------------------------------------
create table if not exists public.club_member_guardian_links (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  guardian_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  ward_membership_id uuid not null references public.club_memberships(id) on delete cascade,
  relationship text,
  created_at timestamptz not null default now(),
  constraint club_member_guardian_links_distinct check (guardian_membership_id <> ward_membership_id),
  constraint club_member_guardian_links_unique unique (club_id, guardian_membership_id, ward_membership_id)
);

create index if not exists idx_club_member_guardian_links_club
  on public.club_member_guardian_links(club_id);
create index if not exists idx_club_member_guardian_links_ward
  on public.club_member_guardian_links(ward_membership_id);
create index if not exists idx_club_member_guardian_links_guardian
  on public.club_member_guardian_links(guardian_membership_id);

alter table public.club_member_guardian_links enable row level security;

drop policy if exists "club_member_guardian_select_staff" on public.club_member_guardian_links;
create policy "club_member_guardian_select_staff"
  on public.club_member_guardian_links for select to authenticated
  using (
    exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = club_member_guardian_links.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role)
    )
  );

drop policy if exists "club_member_guardian_admin_write" on public.club_member_guardian_links;
create policy "club_member_guardian_admin_write"
  on public.club_member_guardian_links for all to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- 3) Resolve login emails to memberships (import validation / upsert targeting)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_club_member_emails_to_memberships(
  _club_id uuid,
  _emails text[]
)
returns table (
  email text,
  membership_id uuid,
  user_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_club_admin(auth.uid(), _club_id) then
    raise exception 'Only club admins can resolve member emails';
  end if;

  return query
  with normalized as (
    select distinct lower(trim(value)) as email
    from unnest(coalesce(_emails, array[]::text[])) as value
    where trim(value) <> ''
  )
  select
    n.email,
    cm.id as membership_id,
    cm.user_id
  from normalized n
  join auth.users u on lower(u.email) = n.email
  join public.club_memberships cm
    on cm.user_id = u.id
   and cm.club_id = _club_id
   and cm.status = 'active';
end;
$$;

revoke all on function public.resolve_club_member_emails_to_memberships(uuid, text[]) from public;
grant execute on function public.resolve_club_member_emails_to_memberships(uuid, text[]) to authenticated;

-- Export: membership_id → login email (admin-only)
create or replace function public.list_club_membership_emails(_club_id uuid)
returns table (
  membership_id uuid,
  email text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    cm.id as membership_id,
    coalesce(u.email, '') as email
  from public.club_memberships cm
  join auth.users u on u.id = cm.user_id
  where cm.club_id = _club_id
    and cm.status = 'active'
    and public.is_club_admin(auth.uid(), _club_id);
$$;

revoke all on function public.list_club_membership_emails(uuid) from public;
grant execute on function public.list_club_membership_emails(uuid) to authenticated;
