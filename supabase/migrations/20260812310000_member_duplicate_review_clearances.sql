-- Admin/trainer can mark a roster or saved-list row as "not a duplicate" after manual review.

create table if not exists public.member_duplicate_review_clearances (
  club_id uuid not null references public.clubs(id) on delete cascade,
  source text not null check (source in ('roster', 'draft')),
  entity_id uuid not null,
  cleared_by uuid references auth.users(id) on delete set null,
  cleared_at timestamptz not null default now(),
  primary key (club_id, source, entity_id)
);

create index if not exists member_duplicate_review_clearances_club_idx
  on public.member_duplicate_review_clearances (club_id, cleared_at desc);

alter table public.member_duplicate_review_clearances enable row level security;

drop policy if exists "duplicate_clearances_select_staff" on public.member_duplicate_review_clearances;
create policy "duplicate_clearances_select_staff"
  on public.member_duplicate_review_clearances for select to authenticated
  using (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
    )
  );

drop policy if exists "duplicate_clearances_insert_staff" on public.member_duplicate_review_clearances;
create policy "duplicate_clearances_insert_staff"
  on public.member_duplicate_review_clearances for insert to authenticated
  with check (
    public.is_member_of_club(auth.uid(), club_id)
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.is_club_trainer(auth.uid(), club_id)
    )
  );

drop policy if exists "duplicate_clearances_delete_admin" on public.member_duplicate_review_clearances;
create policy "duplicate_clearances_delete_admin"
  on public.member_duplicate_review_clearances for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));
