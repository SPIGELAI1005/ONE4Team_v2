-- Draft / publish workflow for public club page configuration.
-- Drafts live in club_public_page_drafts (admin-only RLS) so members never see unpublished JSON.
-- Published snapshot on clubs.public_page_published_config; legacy clubs keep NULL and continue using row columns only.

create table if not exists public.club_public_page_drafts (
  club_id uuid primary key references public.clubs (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists club_public_page_drafts_updated_at_idx
  on public.club_public_page_drafts (updated_at desc);

alter table public.clubs
  add column if not exists public_page_published_config jsonb,
  add column if not exists public_page_published_at timestamptz,
  add column if not exists public_page_published_by uuid references auth.users (id) on delete set null,
  add column if not exists public_page_publish_version integer not null default 0;

comment on table public.club_public_page_drafts is 'Unpublished public club page JSON; visible only to club admins.';
comment on column public.clubs.public_page_published_config is 'Last published public page config JSON; NULL means legacy column-only published state.';

alter table public.club_public_page_drafts enable row level security;

drop policy if exists "club_public_page_drafts_admin_select" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_select"
  on public.club_public_page_drafts
  for select
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_public_page_drafts_admin_insert" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_insert"
  on public.club_public_page_drafts
  for insert
  to authenticated
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_public_page_drafts_admin_update" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_update"
  on public.club_public_page_drafts
  for update
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_public_page_drafts_admin_delete" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_delete"
  on public.club_public_page_drafts
  for delete
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create or replace function public.set_club_public_page_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_club_public_page_drafts_updated_at on public.club_public_page_drafts;
create trigger trg_club_public_page_drafts_updated_at
  before update on public.club_public_page_drafts
  for each row
  execute function public.set_club_public_page_drafts_updated_at();

-- Publish: copy validated draft snapshot onto clubs columns + public_page_published_config.
create or replace function public.publish_club_public_page_config(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_draft jsonb;
  g jsonb;
  b jsonb;
  a jsonb;
  ct jsonb;
  so jsonb;
  se jsonb;
  ob jsonb;
  psec jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_club_admin(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  select d.config into v_draft
  from public.club_public_page_drafts d
  where d.club_id = p_club_id;

  if v_draft is null or v_draft = '{}'::jsonb then
    raise exception 'no_draft';
  end if;

  g := coalesce(v_draft->'general', '{}'::jsonb);
  b := coalesce(v_draft->'branding', '{}'::jsonb);
  a := coalesce(v_draft->'assets', '{}'::jsonb);
  ct := coalesce(v_draft->'contact', '{}'::jsonb);
  so := coalesce(v_draft->'social', '{}'::jsonb);
  se := coalesce(v_draft->'seo', '{}'::jsonb);
  ob := coalesce(v_draft->'onboarding', '{}'::jsonb);
  psec := v_draft->'publicPageSections';

  update public.clubs c
  set
    name = coalesce(nullif(trim(both from g->>'name'), ''), c.name),
    slug = coalesce(nullif(trim(both from g->>'slug'), ''), c.slug),
    description = nullif(trim(both from g->>'description'), ''),
    is_public = coalesce((g->>'is_public')::boolean, c.is_public),
    primary_color = nullif(trim(both from b->>'primary_color'), ''),
    secondary_color = nullif(trim(both from b->>'secondary_color'), ''),
    tertiary_color = nullif(trim(both from b->>'tertiary_color'), ''),
    support_color = nullif(trim(both from b->>'support_color'), ''),
    logo_url = nullif(trim(both from a->>'logo_url'), ''),
    favicon_url = nullif(trim(both from a->>'favicon_url'), ''),
    cover_image_url = nullif(trim(both from a->>'cover_image_url'), ''),
    reference_images = coalesce(a->'reference_images', c.reference_images),
    address = nullif(trim(both from ct->>'address'), ''),
    phone = nullif(trim(both from ct->>'phone'), ''),
    email = nullif(trim(both from ct->>'email'), ''),
    website = nullif(trim(both from ct->>'website'), ''),
    facebook_url = nullif(trim(both from so->>'facebook_url'), ''),
    instagram_url = nullif(trim(both from so->>'instagram_url'), ''),
    twitter_url = nullif(trim(both from so->>'twitter_url'), ''),
    meta_title = nullif(trim(both from se->>'meta_title'), ''),
    meta_description = nullif(trim(both from se->>'meta_description'), ''),
    join_approval_mode = case
      when nullif(trim(both from ob->>'join_approval_mode'), '') in ('manual', 'auto')
        then trim(both from ob->>'join_approval_mode')
      else c.join_approval_mode
    end,
    join_reviewer_policy = case
      when nullif(trim(both from ob->>'join_reviewer_policy'), '') in ('admin_only', 'admin_trainer')
        then trim(both from ob->>'join_reviewer_policy')
      else c.join_reviewer_policy
    end,
    join_default_role = coalesce(nullif(trim(both from ob->>'join_default_role'), ''), c.join_default_role),
    join_default_team = nullif(trim(both from ob->>'join_default_team'), ''),
    public_page_sections = coalesce(psec, c.public_page_sections),
    public_page_published_config = v_draft,
    public_page_published_at = now(),
    public_page_published_by = v_uid,
    public_page_publish_version = coalesce(c.public_page_publish_version, 0) + 1
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'club_id', p_club_id,
    'published_at', now(),
    'version', (select cc.public_page_publish_version from public.clubs cc where cc.id = p_club_id)
  );
end;
$$;

grant execute on function public.publish_club_public_page_config(uuid) to authenticated;
