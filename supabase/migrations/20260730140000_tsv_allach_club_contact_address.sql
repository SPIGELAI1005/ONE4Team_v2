-- TSV Allach 09 only (slug tsv-allach-09): public contact address + map coordinates.

update public.clubs c
set
  address = 'Enterstraße 55, 80999 München',
  latitude = 48.2067894,
  longitude = 11.4487366,
  updated_at = now(),
  public_page_published_config = case
    when c.public_page_published_config is not null then
      jsonb_set(
        jsonb_set(
          jsonb_set(c.public_page_published_config, '{contact,address}', '"Enterstraße 55, 80999 München"'::jsonb, true),
          '{contact,latitude}', '"48.2067894"'::jsonb, true
        ),
        '{contact,longitude}', '"11.4487366"'::jsonb, true
      )
    else c.public_page_published_config
  end
where c.slug = 'tsv-allach-09';

update public.club_public_page_drafts d
set
  config = jsonb_set(
    jsonb_set(
      jsonb_set(d.config, '{contact,address}', '"Enterstraße 55, 80999 München"'::jsonb, true),
      '{contact,latitude}', '"48.2067894"'::jsonb, true
    ),
    '{contact,longitude}', '"11.4487366"'::jsonb, true
  ),
  updated_at = now()
from public.clubs c
where d.club_id = c.id
  and c.slug = 'tsv-allach-09';
