-- Allow clubs to expose selected partners on the public club website (anon read).

alter table public.partners
  add column if not exists show_on_public_club_page boolean not null default false;

comment on column public.partners.show_on_public_club_page is
  'When true and the club is public, anonymous visitors may read this row for the public club homepage.';

drop policy if exists "partners_select_public_club_page" on public.partners;
create policy "partners_select_public_club_page"
on public.partners
for select
to anon, authenticated
using (
  show_on_public_club_page = true
  and exists (
    select 1
    from public.clubs c
    where c.id = partners.club_id
      and coalesce(c.is_public, true) = true
  )
);
