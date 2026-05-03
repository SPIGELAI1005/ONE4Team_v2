-- Public club matches & events: optional logos, public-only summaries, registration links,
-- and flags to enable dedicated public detail pages (still no lineup/notes on those pages).
--
-- Some databases never created `public.events`; skip event DDL when the table is absent.

do $migration$
begin
  if to_regclass('public.matches') is not null then
    alter table public.matches
      add column if not exists opponent_logo_url text;

    alter table public.matches
      add column if not exists public_match_detail_enabled boolean not null default false;

    comment on column public.matches.opponent_logo_url is
      'Optional URL for opponent crest/logo on the public club matches page.';
    comment on column public.matches.public_match_detail_enabled is
      'When true, visitors may open /club/…/matches/:id for basic fixture info (no lineup or internal notes).';
  end if;

  if to_regclass('public.events') is not null then
    alter table public.events
      add column if not exists image_url text;

    alter table public.events
      add column if not exists public_summary text;

    alter table public.events
      add column if not exists public_registration_enabled boolean not null default false;

    alter table public.events
      add column if not exists registration_external_url text;

    alter table public.events
      add column if not exists public_event_detail_enabled boolean not null default false;

    comment on column public.events.image_url is
      'Hero image for the public club events listing and detail page.';
    comment on column public.events.public_summary is
      'Short visitor-safe text for the public site (do not use internal description).';
    comment on column public.events.public_registration_enabled is
      'When true, the public events UI may show a registration call-to-action.';
    comment on column public.events.registration_external_url is
      'Optional external URL for registration (e.g. form or ticketing).';
    comment on column public.events.public_event_detail_enabled is
      'When true, visitors may open /club/…/events/:id for public summary and meta only.';
  end if;
end
$migration$;
