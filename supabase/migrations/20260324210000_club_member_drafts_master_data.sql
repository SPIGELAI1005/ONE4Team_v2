-- Add master_data JSONB column to club_member_drafts so registry fields can be
-- captured at draft stage (before the member actually joins and gets a membership).

alter table public.club_member_drafts
  add column if not exists master_data jsonb not null default '{}'::jsonb;
