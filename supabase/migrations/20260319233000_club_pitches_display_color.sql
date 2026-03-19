-- Optional per-element map color (hex). When null, client uses palette rotation.

alter table public.club_pitches
  add column if not exists display_color text;

comment on column public.club_pitches.display_color is 'Optional #RRGGBB for map visualization; null = auto palette';
