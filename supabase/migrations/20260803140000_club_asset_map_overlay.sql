-- Club-wide Asset Map satellite underlay (bird's-eye photo + transform).
-- Shape: { "url": string, "opacity": 0-1, "scale": number, "offset_x": percent, "offset_y": percent }

alter table public.clubs
  add column if not exists asset_map_overlay jsonb not null default '{}'::jsonb;

comment on column public.clubs.asset_map_overlay is
  'Asset Map satellite underlay: { url, opacity (0-1), scale, offset_x/offset_y as % of map size }.';
