-- Fix invite login: redeem_club_invite marks matching drafts as status = 'joined'
-- (see 20260802130000_redeem_invite_merge_draft_master_data.sql), but the original
-- check only allowed ('draft', 'invited') — causing:
--   new row for relation "club_member_drafts" violates check constraint
--   "club_member_drafts_status_check"
-- (Postgres reports INSERT/UPDATE violations the same way.)

alter table public.club_member_drafts
  drop constraint if exists club_member_drafts_status_check;

alter table public.club_member_drafts
  add constraint club_member_drafts_status_check
  check (status in ('draft', 'invited', 'joined'));

comment on constraint club_member_drafts_status_check on public.club_member_drafts is
  'draft = saved list; invited = invite sent; joined = invite redeemed / member created';
