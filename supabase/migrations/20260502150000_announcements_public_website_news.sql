-- Public club microsite: optional columns for news published to /club/:slug/news.
-- Only rows with publish_to_public_website = true are readable by anon for public clubs.

alter table public.announcements
  add column if not exists publish_to_public_website boolean not null default false;

alter table public.announcements
  add column if not exists public_news_category text not null default 'club';

alter table public.announcements
  add column if not exists image_url text;

alter table public.announcements
  add column if not exists excerpt text;

do $chk$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcements_public_news_category_check'
  ) then
    alter table public.announcements
      add constraint announcements_public_news_category_check
      check (
        public_news_category in ('club', 'teams', 'events', 'youth', 'seniors', 'sponsors')
      );
  end if;
end
$chk$;

comment on column public.announcements.publish_to_public_website is
  'When true and the club is public, this announcement may be listed on the public club website (anon read via RLS).';
comment on column public.announcements.public_news_category is
  'Audience/topic bucket for filters on the public news page.';
comment on column public.announcements.image_url is
  'Optional hero/card image URL for the public news page.';
comment on column public.announcements.excerpt is
  'Optional short summary; falls back to truncated body in the app.';

drop policy if exists "announcements_select_public_website" on public.announcements;
create policy "announcements_select_public_website"
  on public.announcements
  for select
  to anon, authenticated
  using (
    publish_to_public_website = true
    and exists (
      select 1
      from public.clubs c
      where c.id = announcements.club_id
        and coalesce(c.is_public, true) = true
    )
  );
