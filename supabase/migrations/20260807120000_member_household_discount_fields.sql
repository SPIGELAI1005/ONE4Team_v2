-- Family / household discount verification flags on member master records.

alter table public.club_member_master_records
  add column if not exists household_discount_group_id text,
  add column if not exists household_discount_status text
    check (
      household_discount_status is null
      or household_discount_status in ('pending_verification', 'verified', 'rejected')
    );

create index if not exists idx_club_member_master_household_discount
  on public.club_member_master_records (club_id, household_discount_status)
  where household_discount_group_id is not null;
