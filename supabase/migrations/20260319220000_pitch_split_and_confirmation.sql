-- Extend pitch planner with hierarchy + reconfirmation workflow.

alter table public.club_pitches
  add column if not exists parent_pitch_id uuid references public.club_pitches(id) on delete set null;

alter table public.pitch_bookings
  add column if not exists needs_reconfirmation boolean not null default false,
  add column if not exists reconfirmation_status text not null default 'not_required'
    check (reconfirmation_status in ('not_required', 'pending', 'confirmed', 'declined')),
  add column if not exists overridden_by_booking_id uuid references public.pitch_bookings(id) on delete set null,
  add column if not exists reconfirmation_requested_at timestamptz;

create index if not exists idx_club_pitches_parent_pitch_id on public.club_pitches(parent_pitch_id);
create index if not exists idx_pitch_bookings_reconfirmation_status on public.pitch_bookings(reconfirmation_status);
