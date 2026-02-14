-- APPLY_BUNDLE_PHASE4.sql
-- ONE4Team Phase 4 (Manual dues tracking) bundle
--
-- Recommended order on a fresh project:
--   1) supabase/APPLY_BUNDLE_BASELINE.sql
--   2) supabase/APPLY_BUNDLE_PHASE1.sql
--   3) supabase/APPLY_BUNDLE_PHASE0_RLS.sql
--   4) supabase/APPLY_BUNDLE_PHASE2.sql
--   5) supabase/APPLY_BUNDLE_PHASE3.sql
--   6) this bundle

begin;

-- ============================================================
-- membership_dues
-- ============================================================
create table if not exists public.membership_dues (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  due_date date not null,
  amount_cents integer,
  currency text default 'EUR',
  status text not null default 'due', -- 'due' | 'paid' | 'waived'
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(club_id, membership_id, due_date)
);

alter table public.membership_dues enable row level security;

drop trigger if exists update_membership_dues_updated_at on public.membership_dues;
create trigger update_membership_dues_updated_at before update on public.membership_dues
for each row execute function public.update_updated_at();

-- Admins/trainers can manage dues (club-scoped)
drop policy if exists "Admins can read dues" on public.membership_dues;
create policy "Admins can read dues" on public.membership_dues
for select to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

drop policy if exists "Admins can create dues" on public.membership_dues;
create policy "Admins can create dues" on public.membership_dues
for insert to authenticated
with check (public.is_club_trainer(auth.uid(), club_id));

drop policy if exists "Admins can update dues" on public.membership_dues;
create policy "Admins can update dues" on public.membership_dues
for update to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

drop policy if exists "Admins can delete dues" on public.membership_dues;
create policy "Admins can delete dues" on public.membership_dues
for delete to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

-- Members can view their own dues
drop policy if exists "Members can view own dues" on public.membership_dues;
create policy "Members can view own dues" on public.membership_dues
for select to authenticated
using (
  exists (
    select 1
    from public.club_memberships cm
    where cm.id = membership_dues.membership_id
      and cm.user_id = auth.uid()
  )
);

commit;
