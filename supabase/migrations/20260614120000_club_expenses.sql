-- Club expense tracking for financial reports (revenue vs costs / P&L).

create table if not exists public.club_expenses (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  expense_date date not null default (current_date),
  category text not null default 'other' check (
    category in ('facility', 'equipment', 'staff', 'travel', 'referees', 'other')
  ),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_expenses_club_date_idx
  on public.club_expenses (club_id, expense_date desc);

alter table public.club_expenses enable row level security;

drop trigger if exists update_club_expenses_updated_at on public.club_expenses;
create trigger update_club_expenses_updated_at
  before update on public.club_expenses
  for each row execute function public.update_updated_at();

drop policy if exists club_expenses_select_admin on public.club_expenses;
create policy club_expenses_select_admin
  on public.club_expenses for select to authenticated
  using (public.is_club_admin(club_id, auth.uid()));

drop policy if exists club_expenses_insert_admin on public.club_expenses;
create policy club_expenses_insert_admin
  on public.club_expenses for insert to authenticated
  with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists club_expenses_update_admin on public.club_expenses;
create policy club_expenses_update_admin
  on public.club_expenses for update to authenticated
  using (public.is_club_admin(club_id, auth.uid()))
  with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists club_expenses_delete_admin on public.club_expenses;
create policy club_expenses_delete_admin
  on public.club_expenses for delete to authenticated
  using (public.is_club_admin(club_id, auth.uid()));

comment on table public.club_expenses is 'Club cost entries for admin financial reporting (P&L).';
