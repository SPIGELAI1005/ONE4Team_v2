-- Optional vector outline for Asset Map pitches (polygon in % of map canvas).
-- Shape: { "type": "polygon", "points": [{ "x": 0-100, "y": 0-100 }, ...] }
-- Legacy rect JSON ({ type: rect, x, y, w, h, rotation }) is accepted by the app and migrated on read.
-- Display mode lives in clubs.asset_map_overlay.pitch_display: cells | outlines | both

alter table public.club_pitches
  add column if not exists outline jsonb;

comment on column public.club_pitches.outline is
  'Optional Asset Map vector outline: { type: polygon, points: [{x,y},...] } in % of map canvas.';
