-- Pitch planner: designable pitch map + bookings for training/matches.

create table if not exists public.club_pitches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  grid_cells jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, name)
);

create table if not exists public.pitch_bookings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  pitch_id uuid not null references public.club_pitches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  booking_type text not null default 'training' check (booking_type in ('training', 'match', 'other')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_club_pitches_club_id on public.club_pitches(club_id);
create index if not exists idx_pitch_bookings_club_id on public.pitch_bookings(club_id);
create index if not exists idx_pitch_bookings_pitch_time on public.pitch_bookings(pitch_id, starts_at, ends_at);

alter table public.club_pitches enable row level security;
alter table public.pitch_bookings enable row level security;

drop policy if exists club_pitches_select_member on public.club_pitches;
create policy club_pitches_select_member
on public.club_pitches
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_pitches_manage_trainer on public.club_pitches;
create policy club_pitches_manage_trainer
on public.club_pitches
for all
to authenticated
using (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = club_pitches.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = club_pitches.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
);

drop policy if exists pitch_bookings_select_member on public.pitch_bookings;
create policy pitch_bookings_select_member
on public.pitch_bookings
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists pitch_bookings_manage_trainer on public.pitch_bookings;
create policy pitch_bookings_manage_trainer
on public.pitch_bookings
for all
to authenticated
using (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = pitch_bookings.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = pitch_bookings.club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role in ('admin', 'trainer')
  )
);

drop trigger if exists update_club_pitches_updated_at on public.club_pitches;
create trigger update_club_pitches_updated_at
before update on public.club_pitches
for each row execute function public.update_updated_at();

drop trigger if exists update_pitch_bookings_updated_at on public.pitch_bookings;
create trigger update_pitch_bookings_updated_at
before update on public.pitch_bookings
for each row execute function public.update_updated_at();
