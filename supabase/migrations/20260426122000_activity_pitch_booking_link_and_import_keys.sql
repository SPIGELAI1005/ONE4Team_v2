-- Link calendar trainings (activities) with facility schedule (pitch_bookings).
-- Also add import keys so re-running imports can be idempotent.

alter table public.activities
  add column if not exists pitch_booking_id uuid references public.pitch_bookings(id) on delete set null,
  add column if not exists import_key text;

-- ON CONFLICT needs a non-partial unique constraint/index match.
-- Postgres UNIQUE allows multiple NULLs, so this is safe and still idempotent.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'activities'
      and c.conname = 'activities_club_import_key_uniq'
  ) then
    alter table public.activities
      add constraint activities_club_import_key_uniq unique (club_id, import_key);
  end if;
end $$;

alter table public.pitch_bookings
  add column if not exists activity_id uuid references public.activities(id) on delete set null,
  add column if not exists import_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'pitch_bookings'
      and c.conname = 'pitch_bookings_club_import_key_uniq'
  ) then
    alter table public.pitch_bookings
      add constraint pitch_bookings_club_import_key_uniq unique (club_id, import_key);
  end if;
end $$;

