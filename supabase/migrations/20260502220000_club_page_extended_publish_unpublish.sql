-- Extended public club page publish: social + SEO + map + basics mirrored from draft JSON;
-- unpublish helper to hide the public website without deleting published snapshots.

alter table public.clubs
  add column if not exists youtube_url text,
  add column if not exists tiktok_url text,
  add column if not exists club_category text,
  add column if not exists og_image_url text,
  add column if not exists public_seo_allow_indexing boolean not null default true,
  add column if not exists public_seo_structured_data boolean not null default true;

comment on column public.clubs.club_category is 'Optional club type label for admin / future public display (e.g. football, handball).';
comment on column public.clubs.public_seo_allow_indexing is 'When false, public pages should request noindex (honoured by the web app).';

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
    default_language = coalesce(nullif(trim(both from g->>'default_language'), ''), c.default_language),
    timezone = coalesce(nullif(trim(both from g->>'timezone'), ''), c.timezone),
    club_category = nullif(trim(both from g->>'club_category'), ''),
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
    latitude = case
      when ct ? 'latitude' and nullif(trim(both from ct->>'latitude'), '') is not null
        then (ct->>'latitude')::double precision
      else c.latitude
    end,
    longitude = case
      when ct ? 'longitude' and nullif(trim(both from ct->>'longitude'), '') is not null
        then (ct->>'longitude')::double precision
      else c.longitude
    end,
    public_location_notes = coalesce(nullif(trim(both from ct->>'public_location_notes'), ''), c.public_location_notes),
    facebook_url = nullif(trim(both from so->>'facebook_url'), ''),
    instagram_url = nullif(trim(both from so->>'instagram_url'), ''),
    twitter_url = nullif(trim(both from so->>'twitter_url'), ''),
    youtube_url = nullif(trim(both from so->>'youtube_url'), ''),
    tiktok_url = nullif(trim(both from so->>'tiktok_url'), ''),
    meta_title = nullif(trim(both from se->>'meta_title'), ''),
    meta_description = nullif(trim(both from se->>'meta_description'), ''),
    og_image_url = nullif(trim(both from se->>'og_image_url'), ''),
    public_seo_allow_indexing = case
      when se ? 'allow_indexing' then (se->>'allow_indexing')::boolean
      else coalesce(c.public_seo_allow_indexing, true)
    end,
    public_seo_structured_data = case
      when se ? 'structured_data_enabled' then (se->>'structured_data_enabled')::boolean
      else coalesce(c.public_seo_structured_data, true)
    end,
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

-- Hide public website (does not delete draft or published JSON).
create or replace function public.unpublish_club_public_website(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_club_admin(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  update public.clubs c
  set is_public = false
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  return jsonb_build_object('ok', true, 'club_id', p_club_id);
end;
$$;

revoke all on function public.unpublish_club_public_website(uuid) from public;
grant execute on function public.unpublish_club_public_website(uuid) to authenticated;
