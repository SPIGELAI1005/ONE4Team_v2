-- Wave B: weekly digest opt-in, AI fair-use caps RPC, member dues payment claims, club payment instructions

alter table public.clubs
  add column if not exists payment_instructions text,
  add column if not exists payment_iban text;

comment on column public.clubs.payment_instructions is 'Offline payment instructions shown to members (reference, payee name, etc.).';
comment on column public.clubs.payment_iban is 'Club bank IBAN for member self-serve dues payments.';

alter table public.club_memberships
  add column if not exists weekly_digest_opt_in boolean not null default false;

comment on column public.club_memberships.weekly_digest_opt_in is
  'Member/parent opted in to weekly email digest (trainings + open dues).';

create table if not exists public.dues_payment_claims (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  due_id uuid references public.membership_dues(id) on delete set null,
  amount_cents integer,
  currency text not null default 'EUR',
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  claimed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists dues_payment_claims_club_idx
  on public.dues_payment_claims(club_id, claimed_at desc);
create index if not exists dues_payment_claims_membership_idx
  on public.dues_payment_claims(membership_id, status);

alter table public.dues_payment_claims enable row level security;

drop policy if exists dues_payment_claims_select_member on public.dues_payment_claims;
create policy dues_payment_claims_select_member
on public.dues_payment_claims
for select
to authenticated
using (
  public.is_club_admin(club_id, auth.uid())
  or exists (
    select 1 from public.club_memberships m
    where m.id = dues_payment_claims.membership_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists dues_payment_claims_insert_self on public.dues_payment_claims;
create policy dues_payment_claims_insert_self
on public.dues_payment_claims
for insert
to authenticated
with check (
  exists (
    select 1 from public.club_memberships m
    where m.id = membership_id
      and m.club_id = club_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists dues_payment_claims_manage_admin on public.dues_payment_claims;
create policy dues_payment_claims_manage_admin
on public.dues_payment_claims
for update
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create or replace function public.claim_automation_runs(
  _run_type text default 'weekly_digest',
  _limit int default 10
)
returns setof public.automation_runs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.automation_runs r
  set run_status = 'running'
  where r.id in (
    select ar.id
    from public.automation_runs ar
    where ar.run_status = 'queued'
      and ar.run_type = _run_type
    order by ar.started_at asc
    limit greatest(1, least(_limit, 50))
    for update skip locked
  )
  returning r.*;
end;
$$;

create or replace function public.complete_automation_run(
  _run_id uuid,
  _status text,
  _result jsonb default '{}'::jsonb,
  _error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _status not in ('completed', 'failed') then
    raise exception 'Invalid status %', _status;
  end if;

  update public.automation_runs
  set
    run_status = _status,
    result = coalesce(_result, '{}'::jsonb),
    error_message = _error_message,
    finished_at = now()
  where id = _run_id;
end;
$$;

create or replace function public.upsert_weekly_digest_rule(
  _club_id uuid,
  _enabled boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _rule_id uuid;
begin
  if not public.is_club_admin(_club_id, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  insert into public.automation_rules (club_id, rule_type, is_enabled, schedule_cron, config)
  values (_club_id, 'weekly_digest', _enabled, '0 8 * * 1', jsonb_build_object('channel', 'email'))
  on conflict (club_id, rule_type)
  do update set
    is_enabled = excluded.is_enabled,
    updated_at = now()
  returning id into _rule_id;

  return _rule_id;
end;
$$;

create or replace function public.set_weekly_digest_opt_in(
  _club_id uuid,
  _opt_in boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.club_memberships
  set weekly_digest_opt_in = _opt_in
  where club_id = _club_id
    and user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'Active membership not found';
  end if;
end;
$$;

create or replace function public.submit_due_payment_claim(
  _club_id uuid,
  _due_id uuid,
  _note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _membership_id uuid;
  _due public.membership_dues%rowtype;
  _claim_id uuid;
begin
  select m.id into _membership_id
  from public.club_memberships m
  where m.club_id = _club_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;

  if _membership_id is null then
    raise exception 'not_member';
  end if;

  select * into _due
  from public.membership_dues d
  where d.id = _due_id
    and d.club_id = _club_id
    and d.status = 'due';

  if not found then
    raise exception 'due_not_found';
  end if;

  if _due.membership_id <> _membership_id
     and not exists (
       select 1
       from public.club_member_guardian_links g
       where g.club_id = _club_id
         and g.guardian_membership_id = _membership_id
         and g.ward_membership_id = _due.membership_id
     ) then
    raise exception 'not_authorized_for_due';
  end if;

  if exists (
    select 1 from public.dues_payment_claims c
    where c.due_id = _due_id and c.status = 'pending'
  ) then
    raise exception 'claim_already_pending';
  end if;

  insert into public.dues_payment_claims (
    club_id, membership_id, due_id, amount_cents, currency, note
  )
  values (
    _club_id, _membership_id, _due_id, _due.amount_cents, coalesce(_due.currency, 'EUR'), _note
  )
  returning id into _claim_id;

  return _claim_id;
end;
$$;

create or replace function public.get_club_ai_monthly_usage(_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := date_trunc('month', now());
  _to timestamptz := now();
  _conversations int := 0;
  _agent_total int := 0;
begin
  if auth.uid() is not null and not public.is_club_admin(_club_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select count(*)::int into _conversations
  from public.ai_conversations c
  where c.club_id = _club_id
    and c.updated_at >= _from
    and c.updated_at <= _to;

  select count(*)::int into _agent_total
  from public.ai_agent_runs r
  where r.club_id = _club_id
    and r.created_at >= _from
    and r.created_at <= _to;

  return jsonb_build_object(
    'period', 'month',
    'from', _from,
    'to', _to,
    'conversations_updated', _conversations,
    'agent_runs_total', _agent_total
  );
exception
  when undefined_table then
    return jsonb_build_object(
      'period', 'month',
      'from', _from,
      'to', _to,
      'conversations_updated', 0,
      'agent_runs_total', 0
    );
end;
$$;

grant execute on function public.claim_automation_runs(text, int) to service_role;
grant execute on function public.complete_automation_run(uuid, text, jsonb, text) to service_role;
grant execute on function public.upsert_weekly_digest_rule(uuid, boolean) to authenticated;
grant execute on function public.set_weekly_digest_opt_in(uuid, boolean) to authenticated;
grant execute on function public.submit_due_payment_claim(uuid, uuid, text) to authenticated;
grant execute on function public.get_club_ai_monthly_usage(uuid) to authenticated, service_role;
