-- TSV Allach 09: seed football camp events (idempotent via import_key).
-- Prerequisite: 20260627120000_club_events_camp_fields.sql and public events columns from 20260502190000.
-- Run in Supabase SQL Editor.

do $seed$
declare
  v_club_id uuid;
  v_created_by uuid;
begin
  if to_regclass('public.events') is null then
    raise exception 'public.events does not exist';
  end if;

  select c.id into v_club_id from public.clubs c where c.slug = 'tsv-allach-09' limit 1;
  if v_club_id is null then
    raise exception 'Club tsv-allach-09 not found';
  end if;

  select m.user_id into v_created_by
  from public.club_memberships m
  where m.club_id = v_club_id and m.status = 'active' and m.role in ('admin', 'trainer')
  order by case when m.role = 'admin' then 0 else 1 end, m.created_at
  limit 1;

  if v_created_by is null then
    raise exception 'No active admin/trainer membership for club';
  end if;

  insert into public.events (
    club_id, title, description, event_type, location, starts_at, ends_at,
    created_by, image_url, public_summary, registration_external_url,
    public_registration_enabled, public_event_detail_enabled, publish_to_public_schedule,
    target_audience, partner_name, contact_email, import_key
  ) values (
    v_club_id,
    'Sommer Fussball Camp 2026',
    'Trainiere mit offiziellen Coaches vom Bologna FC. Sorglos-Paket inkl. Verpflegung und Camp-Outfit.',
    'camp',
    'Sportanlage TSV Allach 09, Enterstr. 55, 80999 München',
    timestamptz '2026-08-03 09:00:00+02',
    timestamptz '2026-08-07 16:00:00+02',
    v_created_by,
    '/images/camps/sommer-fussball-camp-2026.png',
    'Gemischt · 03.08. bis 07.08.2026 · Campus Rossoblù × TSV Allach 09',
    'https://soccer4kids.com',
    true, true, true,
    'Gemischt',
    'Campus Rossoblù · Bologna FC 1909',
    'info@soccer4kids.com',
    'tsv-allach-sommer-fussball-camp-2026'
  )
  on conflict (club_id, import_key) where import_key is not null do update set
    title = excluded.title,
    description = excluded.description,
    location = excluded.location,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    image_url = excluded.image_url,
    public_summary = excluded.public_summary,
    registration_external_url = excluded.registration_external_url,
    target_audience = excluded.target_audience,
    partner_name = excluded.partner_name,
    contact_email = excluded.contact_email,
    updated_at = now();

  insert into public.events (
    club_id, title, description, event_type, location, starts_at, ends_at,
    created_by, image_url, public_summary, registration_external_url,
    public_registration_enabled, public_event_detail_enabled, publish_to_public_schedule,
    target_audience, partner_name, contact_email, import_key
  ) values (
    v_club_id,
    'Saison Vorbereitung Fussball Camp 2026',
    'Saisonvorbereitung mit Campus Rossoblù für Jungs ab U12.',
    'camp',
    'Sportanlage TSV Allach 09, Enterstr. 55, 80999 München',
    timestamptz '2026-09-07 09:00:00+02',
    timestamptz '2026-09-11 16:00:00+02',
    v_created_by,
    '/images/camps/saison-vorbereitung-camp-2026.png',
    'Jungs ab U12 · 07.09. bis 11.09.2026 · Campus Rossoblù × TSV Allach 09',
    'https://soccer4kids.com',
    true, true, true,
    'Jungs ab U12',
    'Campus Rossoblù · Bologna FC 1909',
    'info@soccer4kids.com',
    'tsv-allach-saison-vorbereitung-camp-2026'
  )
  on conflict (club_id, import_key) where import_key is not null do update set
    title = excluded.title,
    description = excluded.description,
    location = excluded.location,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    image_url = excluded.image_url,
    public_summary = excluded.public_summary,
    registration_external_url = excluded.registration_external_url,
    target_audience = excluded.target_audience,
    partner_name = excluded.partner_name,
    contact_email = excluded.contact_email,
    updated_at = now();

  raise notice 'Football camp seed complete for club %', v_club_id;
end
$seed$;
