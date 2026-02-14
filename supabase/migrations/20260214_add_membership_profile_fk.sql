-- Add a direct FK from club_memberships.user_id → profiles.user_id
-- so PostgREST can resolve the join used by the Members page.
-- (profiles.user_id is already UNIQUE NOT NULL, so this is safe.)

alter table public.club_memberships
  add constraint club_memberships_profile_fk
  foreign key (user_id) references public.profiles(user_id)
  on delete cascade
  not valid;

-- Validate separately (non-blocking on large tables)
alter table public.club_memberships
  validate constraint club_memberships_profile_fk;
