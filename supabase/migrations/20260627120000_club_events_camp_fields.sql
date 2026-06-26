-- Club events: football camp metadata + idempotent import_key for admin templates.
-- Apply after public events microsite columns (20260502190000, 20260502180000).

do $ddl$
begin
  if to_regclass('public.events') is null then
    return;
  end if;

  alter table public.events
    add column if not exists team_id uuid references public.teams(id) on delete set null,
    add column if not exists target_audience text,
    add column if not exists partner_name text,
    add column if not exists contact_email text,
    add column if not exists import_key text;

  create unique index if not exists events_club_import_key_uidx
    on public.events (club_id, import_key)
    where import_key is not null;

  comment on column public.events.team_id is
    'Optional team scope; null means club-wide event.';
  comment on column public.events.target_audience is
    'Human-readable audience label (e.g. Gemischt, Jungs ab U12).';
  comment on column public.events.partner_name is
    'External partner label shown on public camp cards.';
  comment on column public.events.contact_email is
    'Public contact email for registrations and questions.';
  comment on column public.events.import_key is
    'Stable key for template upserts and operator seeds (unique per club).';
end
$ddl$;
