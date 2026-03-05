-- Saved member drafts let admins prepare member lists before sending invites.

create table if not exists public.club_member_drafts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text,
  email text not null,
  role public.app_role not null default 'member',
  team text,
  age_group text,
  position text,
  status text not null default 'draft' check (status in ('draft', 'invited')),
  invite_id uuid references public.club_invites(id) on delete set null,
  invited_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_member_drafts_club_id on public.club_member_drafts(club_id);
create index if not exists idx_club_member_drafts_status on public.club_member_drafts(status);
create index if not exists idx_club_member_drafts_email_lower on public.club_member_drafts(lower(email));

alter table public.club_member_drafts enable row level security;

drop policy if exists "club_member_drafts_select_admin" on public.club_member_drafts;
create policy "club_member_drafts_select_admin"
  on public.club_member_drafts for select
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_member_drafts_insert_admin" on public.club_member_drafts;
create policy "club_member_drafts_insert_admin"
  on public.club_member_drafts for insert
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_member_drafts_update_admin" on public.club_member_drafts;
create policy "club_member_drafts_update_admin"
  on public.club_member_drafts for update
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_member_drafts_delete_admin" on public.club_member_drafts;
create policy "club_member_drafts_delete_admin"
  on public.club_member_drafts for delete
  using (public.is_club_admin(auth.uid(), club_id));
