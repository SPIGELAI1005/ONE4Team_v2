-- APPLY_BUNDLE_PHASE6.sql
-- ONE4Team Phase 6 (AI copilots v1) bundle
--
-- Goal: safe, club-scoped AI request logging + reproducible outputs.
-- Note: This bundle ONLY adds logging storage + RLS. The app may use a stub generator locally.
--
-- Recommended order on a fresh project:
--   1) supabase/APPLY_BUNDLE_BASELINE.sql
--   2) supabase/APPLY_BUNDLE_PHASE1.sql
--   3) supabase/APPLY_BUNDLE_PHASE0_RLS.sql
--   4) supabase/APPLY_BUNDLE_PHASE2.sql
--   5) supabase/APPLY_BUNDLE_PHASE3.sql
--   6) supabase/APPLY_BUNDLE_PHASE4.sql
--   7) supabase/APPLY_BUNDLE_PHASE5.sql
--   8) this bundle

begin;

-- ============================================================
-- ai_requests
-- ============================================================
create table if not exists public.ai_requests (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null,
  kind text not null, -- 'training_plan' | 'admin_digest' (extensible)
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

alter table public.ai_requests enable row level security;

-- Members can insert requests for their own club (self-authored)
create policy if not exists "Members can create ai requests" on public.ai_requests
for insert to authenticated
with check (
  public.is_member_of_club(auth.uid(), club_id)
  and user_id = auth.uid()
);

-- Users can read their own requests
create policy if not exists "Users can read own ai requests" on public.ai_requests
for select to authenticated
using (user_id = auth.uid());

-- Trainers/admins can read all requests in their club (for audit/debug)
create policy if not exists "Trainers can read club ai requests" on public.ai_requests
for select to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

-- Admins/trainers can delete requests in their club (optional cleanup)
create policy if not exists "Trainers can delete club ai requests" on public.ai_requests
for delete to authenticated
using (public.is_club_trainer(auth.uid(), club_id));

commit;
