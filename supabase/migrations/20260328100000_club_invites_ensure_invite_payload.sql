-- Ensure club_invites.invite_payload exists for Members page "Send invite" and redeem_club_invite.
-- Same as 20260301124500_member_import_validation_and_invite_payload.sql (idempotent).
-- Apply this if you see: "Could not find the 'invite_payload' column of 'club_invites' in the schema cache"

alter table public.club_invites
  add column if not exists invite_payload jsonb not null default '{}'::jsonb;
