-- v2.3: Partner portal real workflows (contracts, invoices, tasks, renewals)

create table if not exists public.partner_contracts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  title text not null,
  contract_status text not null default 'draft' check (contract_status in ('draft', 'active', 'paused', 'expired', 'terminated')),
  start_date date,
  end_date date,
  value_eur numeric(12,2),
  renewal_date date,
  terms jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_invoices (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  contract_id uuid references public.partner_contracts(id) on delete set null,
  invoice_no text not null,
  amount_eur numeric(12,2) not null default 0,
  due_date date,
  paid_at timestamptz,
  invoice_status text not null default 'pending' check (invoice_status in ('pending', 'paid', 'overdue', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, invoice_no)
);

create table if not exists public.partner_tasks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  contract_id uuid references public.partner_contracts(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  task_status text not null default 'open' check (task_status in ('open', 'in_progress', 'done', 'cancelled')),
  due_date date,
  assigned_to_user_id uuid,
  completed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_contracts_club_partner_idx on public.partner_contracts(club_id, partner_id, contract_status);
create index if not exists partner_invoices_club_status_idx on public.partner_invoices(club_id, invoice_status, due_date);
create index if not exists partner_tasks_club_status_idx on public.partner_tasks(club_id, task_status, due_date);

alter table public.partner_contracts enable row level security;
alter table public.partner_invoices enable row level security;
alter table public.partner_tasks enable row level security;

drop policy if exists partner_contracts_select_member on public.partner_contracts;
create policy partner_contracts_select_member
on public.partner_contracts
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists partner_contracts_manage_admin on public.partner_contracts;
create policy partner_contracts_manage_admin
on public.partner_contracts
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists partner_invoices_select_member on public.partner_invoices;
create policy partner_invoices_select_member
on public.partner_invoices
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists partner_invoices_manage_admin on public.partner_invoices;
create policy partner_invoices_manage_admin
on public.partner_invoices
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

drop policy if exists partner_tasks_select_member on public.partner_tasks;
create policy partner_tasks_select_member
on public.partner_tasks
for select
to authenticated
using (public.is_member_of_club(club_id, auth.uid()));

drop policy if exists partner_tasks_manage_admin on public.partner_tasks;
create policy partner_tasks_manage_admin
on public.partner_tasks
for all
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));
