-- Default JSON for new club rows includes matches, messages (communication teaser), and ONE4AI sections.
-- Existing rows: missing keys are filled client-side via parsePublicPageSections (DEFAULT_PUBLIC_PAGE_SECTIONS).

alter table public.clubs
  alter column public_page_sections set default
  '{"about":true,"news":true,"teams":true,"shop":true,"media":true,"schedule":true,"events":true,"matches":true,"messages":true,"one4ai":true,"documents":true,"faq":true,"nextsteps":true,"reports":true,"livescores":true,"contact":true}'::jsonb;
