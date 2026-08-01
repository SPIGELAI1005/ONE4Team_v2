-- Allow saved-list entries without a contact email (registry imports, minors, etc.).

alter table public.club_member_drafts
  alter column email drop not null;

comment on column public.club_member_drafts.email is
  'Optional household/contact email. Invites require an email; registry rows without email are searchable by name and club member number.';
