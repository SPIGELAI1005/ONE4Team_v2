-- Repair: membership_fee_types + payments missing on some environments
-- (original tables in 20260210190205 may not have been applied on production).
-- Fixes PostgREST error: Could not find the table 'public.membership_fee_types' in the schema cache

create table if not exists public.membership_fee_types (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  amount numeric(10, 2) not null,
  currency text default 'EUR',
  interval text default 'monthly',
  description text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_membership_fee_types_club_id
  on public.membership_fee_types (club_id);

alter table public.membership_fee_types enable row level security;

drop policy if exists "Members can view fee types" on public.membership_fee_types;
create policy "Members can view fee types"
  on public.membership_fee_types for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists "Admins can manage fee types" on public.membership_fee_types;
create policy "Admins can manage fee types"
  on public.membership_fee_types for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can update fee types" on public.membership_fee_types;
create policy "Admins can update fee types"
  on public.membership_fee_types for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can delete fee types" on public.membership_fee_types;
create policy "Admins can delete fee types"
  on public.membership_fee_types for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  fee_type_id uuid references public.membership_fee_types(id) on delete set null,
  amount numeric(10, 2) not null,
  currency text default 'EUR',
  status text default 'pending',
  due_date date not null,
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_status_check check (status in ('pending', 'paid', 'overdue', 'cancelled'))
);

create index if not exists idx_payments_club_id on public.payments (club_id);
create index if not exists idx_payments_membership_id on public.payments (membership_id);
create index if not exists idx_payments_club_due_date on public.payments (club_id, due_date desc);
create index if not exists idx_payments_fee_type_id on public.payments (fee_type_id);

alter table public.payments enable row level security;

drop trigger if exists update_payments_updated_at on public.payments;
create trigger update_payments_updated_at
  before update on public.payments
  for each row execute function public.update_updated_at();

drop policy if exists "Members can view own payments" on public.payments;
create policy "Members can view own payments"
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.club_memberships cm
      where cm.id = membership_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all payments" on public.payments;
create policy "Admins can view all payments"
  on public.payments for select to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can create payments" on public.payments;
create policy "Admins can create payments"
  on public.payments for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can update payments" on public.payments;
create policy "Admins can update payments"
  on public.payments for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can delete payments" on public.payments;
create policy "Admins can delete payments"
  on public.payments for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

notify pgrst, 'reload schema';
