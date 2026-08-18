-- Wave 5 Team Operations: team cashbox ledger (NOT club payments/expenses) + helpers.
-- Balance is derived from entries — never store a mutable balance column as source of truth.

-- ---------------------------------------------------------------------------
-- 1) Team ledger accounts (one cashbox per team)
-- ---------------------------------------------------------------------------
create table if not exists public.team_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null default 'Team cashbox',
  currency text not null default 'EUR',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id)
);

create index if not exists team_ledger_accounts_club_idx
  on public.team_ledger_accounts (club_id);

drop trigger if exists update_team_ledger_accounts_updated_at on public.team_ledger_accounts;
create trigger update_team_ledger_accounts_updated_at
  before update on public.team_ledger_accounts
  for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Team ledger entries (append-friendly transaction rows)
-- ---------------------------------------------------------------------------
create table if not exists public.team_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  account_id uuid not null references public.team_ledger_accounts(id) on delete cascade,
  entry_date date not null default (current_date),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'other'
    check (category in (
      'contribution', 'kit', 'travel', 'equipment', 'event', 'refund', 'other'
    )),
  description text,
  membership_id uuid references public.club_memberships(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_ledger_entries_team_date_idx
  on public.team_ledger_entries (club_id, team_id, entry_date desc);

create index if not exists team_ledger_entries_account_idx
  on public.team_ledger_entries (account_id, entry_date desc);

drop trigger if exists update_team_ledger_entries_updated_at on public.team_ledger_entries;
create trigger update_team_ledger_entries_updated_at
  before update on public.team_ledger_entries
  for each row execute function public.update_updated_at();

comment on table public.team_ledger_accounts is
  'Per-team cashbox account. Independent of club payments / membership_dues / club_expenses.';
comment on table public.team_ledger_entries is
  'Team cashbox transactions. Balance = sum(in) - sum(out). Never overload club finance tables.';

alter table public.team_ledger_accounts enable row level security;
alter table public.team_ledger_entries enable row level security;

-- Staff / coaches for the team, or club admin (audit). Never payments RLS.
create or replace function public.can_manage_team_ledger(_user_id uuid, _club_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _user_id is not null
    and public.is_member_of_club(_user_id, _club_id)
    and (
      public.is_club_admin(_user_id, _club_id)
      or public.is_club_trainer(_user_id, _club_id)
      or public.is_team_admin_user(_user_id, _team_id)
      or exists (
        select 1
        from public.club_memberships cm
        where cm.club_id = _club_id
          and cm.user_id = _user_id
          and cm.status = 'active'
          and cm.role::text = 'team_management'
      )
    );
$$;

revoke all on function public.can_manage_team_ledger(uuid, uuid, uuid) from public;
grant execute on function public.can_manage_team_ledger(uuid, uuid, uuid) to authenticated;

drop policy if exists "team_ledger_accounts_select" on public.team_ledger_accounts;
create policy "team_ledger_accounts_select"
  on public.team_ledger_accounts for select to authenticated
  using (public.can_manage_team_ledger(auth.uid(), club_id, team_id));

drop policy if exists "team_ledger_accounts_insert" on public.team_ledger_accounts;
create policy "team_ledger_accounts_insert"
  on public.team_ledger_accounts for insert to authenticated
  with check (public.can_manage_team_ledger(auth.uid(), club_id, team_id));

drop policy if exists "team_ledger_accounts_update" on public.team_ledger_accounts;
create policy "team_ledger_accounts_update"
  on public.team_ledger_accounts for update to authenticated
  using (public.can_manage_team_ledger(auth.uid(), club_id, team_id))
  with check (public.can_manage_team_ledger(auth.uid(), club_id, team_id));

drop policy if exists "team_ledger_entries_select" on public.team_ledger_entries;
create policy "team_ledger_entries_select"
  on public.team_ledger_entries for select to authenticated
  using (public.can_manage_team_ledger(auth.uid(), club_id, team_id));

drop policy if exists "team_ledger_entries_insert" on public.team_ledger_entries;
create policy "team_ledger_entries_insert"
  on public.team_ledger_entries for insert to authenticated
  with check (public.can_manage_team_ledger(auth.uid(), club_id, team_id));

drop policy if exists "team_ledger_entries_update" on public.team_ledger_entries;
create policy "team_ledger_entries_update"
  on public.team_ledger_entries for update to authenticated
  using (public.can_manage_team_ledger(auth.uid(), club_id, team_id))
  with check (public.can_manage_team_ledger(auth.uid(), club_id, team_id));

drop policy if exists "team_ledger_entries_delete" on public.team_ledger_entries;
create policy "team_ledger_entries_delete"
  on public.team_ledger_entries for delete to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.can_manage_team_ledger(auth.uid(), club_id, team_id)
  );

-- Ensure account exists + post entry in one RPC
create or replace function public.post_team_ledger_entry(
  _team_id uuid,
  _direction text,
  _amount numeric,
  _category text default 'other',
  _description text default null,
  _entry_date date default current_date,
  _membership_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_account_id uuid;
  v_entry_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if _direction not in ('in', 'out') then
    return jsonb_build_object('ok', false, 'error', 'invalid_direction');
  end if;

  if _amount is null or _amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  if _category is null or _category not in (
    'contribution', 'kit', 'travel', 'equipment', 'event', 'refund', 'other'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_category');
  end if;

  select * into v_team from public.teams where id = _team_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'team_not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_team.club_id, v_team.id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_account_id
  from public.team_ledger_accounts
  where team_id = v_team.id;

  if v_account_id is null then
    insert into public.team_ledger_accounts (club_id, team_id, created_by)
    values (v_team.club_id, v_team.id, v_uid)
    returning id into v_account_id;
  end if;

  insert into public.team_ledger_entries (
    club_id, team_id, account_id, entry_date, direction, amount,
    category, description, membership_id, created_by
  ) values (
    v_team.club_id, v_team.id, v_account_id, coalesce(_entry_date, current_date),
    _direction, round(_amount, 2), _category,
    nullif(trim(coalesce(_description, '')), ''),
    _membership_id, v_uid
  )
  returning id into v_entry_id;

  return jsonb_build_object(
    'ok', true,
    'entry_id', v_entry_id,
    'account_id', v_account_id
  );
end;
$$;

revoke all on function public.post_team_ledger_entry(uuid, text, numeric, text, text, date, uuid) from public;
grant execute on function public.post_team_ledger_entry(uuid, text, numeric, text, text, date, uuid) to authenticated;

create or replace function public.team_ledger_balance(_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_in numeric;
  v_out numeric;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_team from public.teams where id = _team_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'team_not_found');
  end if;

  if not public.can_manage_team_ledger(v_uid, v_team.club_id, v_team.id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select
    coalesce(sum(case when direction = 'in' then amount else 0 end), 0),
    coalesce(sum(case when direction = 'out' then amount else 0 end), 0)
  into v_in, v_out
  from public.team_ledger_entries
  where team_id = v_team.id;

  return jsonb_build_object(
    'ok', true,
    'currency', coalesce(
      (select currency from public.team_ledger_accounts where team_id = v_team.id limit 1),
      'EUR'
    ),
    'total_in', v_in,
    'total_out', v_out,
    'balance', v_in - v_out
  );
end;
$$;

revoke all on function public.team_ledger_balance(uuid) from public;
grant execute on function public.team_ledger_balance(uuid) to authenticated;
