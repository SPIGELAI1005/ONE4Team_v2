-- APPLY_BUNDLE_PHASE5.sql
-- ONE4Team Phase 5 (Partner portal stub) bundle
--
-- Recommended order on a fresh project:
--   1) supabase/APPLY_BUNDLE_BASELINE.sql
--   2) supabase/APPLY_BUNDLE_PHASE1.sql
--   3) supabase/APPLY_BUNDLE_PHASE0_RLS.sql
--   4) supabase/APPLY_BUNDLE_PHASE2.sql
--   5) supabase/APPLY_BUNDLE_PHASE3.sql
--   6) supabase/APPLY_BUNDLE_PHASE4.sql
--   7) this bundle

begin;

-- ============================================================
-- partners (stub)
-- ============================================================
create table if not exists public.partners (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  partner_type text not null default 'sponsor', -- 'sponsor' | 'supplier' | 'service_provider' | 'consultant' | 'other'
  notes text,
  website text,
  email text,
  phone text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partners enable row level security;

drop trigger if exists update_partners_updated_at on public.partners;
create trigger update_partners_updated_at before update on public.partners
for each row execute function public.update_updated_at();

-- Read: club members can view partners (club-scoped)
create policy if not exists "Members can view partners" on public.partners
for select to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

-- Write: admins/trainers can manage partners (club-scoped)
create policy if not exists "Admins can create partners" on public.partners
for insert to authenticated
with check (public.is_club_trainer(auth.uid(), club_id) and (created_by is null or created_by = auth.uid()));

create policy if not exists "Admins can update partners" on public.partners
for update to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

create policy if not exists "Admins can delete partners" on public.partners
for delete to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

commit;
