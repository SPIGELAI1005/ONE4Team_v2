-- Team Management can manage club public page + shop (matches RBAC club_page/club_shop: full).
-- Audit trail for club page and shop changes (who / what / when).

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_club_public_page(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_club_admin(_user_id, _club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.user_id = _user_id
        and cm.club_id = _club_id
        and cm.status = 'active'
        and (
          cm.role::text = 'team_management'
          or exists (
            select 1
            from public.club_role_assignments cra
            where cra.membership_id = cm.id
              and cra.club_id = _club_id
              and cra.scope = 'club'
              and cra.role_kind = 'team_management'
          )
        )
    );
$$;

revoke all on function public.can_manage_club_public_page(uuid, uuid) from public;
grant execute on function public.can_manage_club_public_page(uuid, uuid) to authenticated;

create or replace function public.can_manage_club_shop(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_club_public_page(_user_id, _club_id);
$$;

revoke all on function public.can_manage_club_shop(uuid, uuid) from public;
grant execute on function public.can_manage_club_shop(uuid, uuid) to authenticated;

comment on function public.can_manage_club_public_page(uuid, uuid) is
  'Club admins and Team Management can edit/publish the public club website.';
comment on function public.can_manage_club_shop(uuid, uuid) is
  'Club admins and Team Management can manage the club shop catalog.';

-- ---------------------------------------------------------------------------
-- Club public page draft RLS
-- ---------------------------------------------------------------------------

drop policy if exists "club_public_page_drafts_admin_select" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_select"
  on public.club_public_page_drafts
  for select
  to authenticated
  using (public.can_manage_club_public_page(auth.uid(), club_id));

drop policy if exists "club_public_page_drafts_admin_insert" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_insert"
  on public.club_public_page_drafts
  for insert
  to authenticated
  with check (public.can_manage_club_public_page(auth.uid(), club_id));

drop policy if exists "club_public_page_drafts_admin_update" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_update"
  on public.club_public_page_drafts
  for update
  to authenticated
  using (public.can_manage_club_public_page(auth.uid(), club_id))
  with check (public.can_manage_club_public_page(auth.uid(), club_id));

drop policy if exists "club_public_page_drafts_admin_delete" on public.club_public_page_drafts;
create policy "club_public_page_drafts_admin_delete"
  on public.club_public_page_drafts
  for delete
  to authenticated
  using (public.can_manage_club_public_page(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- Shop RLS
-- ---------------------------------------------------------------------------

drop policy if exists shop_categories_manage_admin on public.shop_categories;
create policy shop_categories_manage_admin
on public.shop_categories
for all
to authenticated
using (public.can_manage_club_shop(club_id, auth.uid()))
with check (public.can_manage_club_shop(club_id, auth.uid()));

drop policy if exists shop_products_manage_admin on public.shop_products;
create policy shop_products_manage_admin
on public.shop_products
for all
to authenticated
using (public.can_manage_club_shop(club_id, auth.uid()))
with check (public.can_manage_club_shop(club_id, auth.uid()));

drop policy if exists shop_orders_manage_admin on public.shop_orders;
create policy shop_orders_manage_admin
on public.shop_orders
for update
to authenticated
using (public.can_manage_club_shop(club_id, auth.uid()))
with check (public.can_manage_club_shop(club_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: club page assets + shop product images
-- ---------------------------------------------------------------------------

drop policy if exists "images_clubs_admin_insert" on storage.objects;
create policy "images_clubs_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_public_page(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "images_clubs_admin_update" on storage.objects;
create policy "images_clubs_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_public_page(auth.uid(), split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_public_page(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "images_clubs_admin_delete" on storage.objects;
create policy "images_clubs_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images-clubs'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_public_page(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "shop_product_images_admin_insert" on storage.objects;
create policy "shop_product_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_shop(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "shop_product_images_admin_update" on storage.objects;
create policy "shop_product_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_shop(auth.uid(), split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_shop(auth.uid(), split_part(name, '/', 1)::uuid)
);

drop policy if exists "shop_product_images_admin_delete" on storage.objects;
create policy "shop_product_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'shop-product-images'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_manage_club_shop(auth.uid(), split_part(name, '/', 1)::uuid)
);

-- ---------------------------------------------------------------------------
-- Audit tables
-- ---------------------------------------------------------------------------

create table if not exists public.club_public_page_audit_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  event_type text not null,
  summary text,
  detail jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_public_page_audit_club_created
  on public.club_public_page_audit_events (club_id, created_at desc);

alter table public.club_public_page_audit_events enable row level security;

drop policy if exists "club_public_page_audit_select_managers" on public.club_public_page_audit_events;
create policy "club_public_page_audit_select_managers"
  on public.club_public_page_audit_events for select
  to authenticated
  using (public.can_manage_club_public_page(auth.uid(), club_id));

create table if not exists public.club_shop_audit_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  category_id uuid references public.shop_categories(id) on delete set null,
  event_type text not null,
  summary text,
  detail jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_shop_audit_club_created
  on public.club_shop_audit_events (club_id, created_at desc);

alter table public.club_shop_audit_events enable row level security;

drop policy if exists "club_shop_audit_select_managers" on public.club_shop_audit_events;
create policy "club_shop_audit_select_managers"
  on public.club_shop_audit_events for select
  to authenticated
  using (public.can_manage_club_shop(auth.uid(), club_id));

-- ---------------------------------------------------------------------------
-- Audit timeline RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_club_public_page_audit_timeline(_club_id uuid)
returns table (
  id uuid,
  event_type text,
  summary text,
  detail jsonb,
  actor_user_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.can_manage_club_public_page(auth.uid(), _club_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    e.id,
    e.event_type,
    e.summary,
    e.detail,
    e.actor_user_id,
    e.created_at
  from public.club_public_page_audit_events e
  where e.club_id = _club_id
  order by e.created_at desc
  limit 250;
end;
$$;

revoke all on function public.get_club_public_page_audit_timeline(uuid) from public;
grant execute on function public.get_club_public_page_audit_timeline(uuid) to authenticated;

create or replace function public.get_club_shop_audit_timeline(_club_id uuid)
returns table (
  id uuid,
  event_type text,
  summary text,
  detail jsonb,
  actor_user_id uuid,
  created_at timestamptz,
  product_id uuid,
  category_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.can_manage_club_shop(auth.uid(), _club_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    e.id,
    e.event_type,
    e.summary,
    e.detail,
    e.actor_user_id,
    e.created_at,
    e.product_id,
    e.category_id
  from public.club_shop_audit_events e
  where e.club_id = _club_id
  order by e.created_at desc
  limit 250;
end;
$$;

revoke all on function public.get_club_shop_audit_timeline(uuid) from public;
grant execute on function public.get_club_shop_audit_timeline(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Draft upsert RPC (Team Management + audit)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_club_public_page_draft(
  p_club_id uuid,
  p_config jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_keys text[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.can_manage_club_public_page(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  insert into public.club_public_page_drafts (club_id, config, updated_by)
  values (p_club_id, coalesce(p_config, '{}'::jsonb), v_uid)
  on conflict (club_id) do update
    set config = excluded.config,
        updated_by = excluded.updated_by,
        updated_at = now();

  select coalesce(array_agg(k order by k), '{}'::text[])
  into v_keys
  from jsonb_object_keys(coalesce(p_config, '{}'::jsonb)) as k;

  insert into public.club_public_page_audit_events (
    club_id, event_type, summary, detail, actor_user_id
  )
  values (
    p_club_id,
    'draft_saved',
    'Saved club page draft',
    jsonb_build_object('config_sections', to_jsonb(v_keys)),
    v_uid
  );

  return jsonb_build_object('ok', true, 'club_id', p_club_id);
end;
$$;

grant execute on function public.upsert_club_public_page_draft(uuid, jsonb) to authenticated;

comment on function public.upsert_club_public_page_draft(uuid, jsonb) is
  'Create or update club_public_page_drafts for club admins and Team Management.';

-- ---------------------------------------------------------------------------
-- Publish / unpublish RPCs (Team Management + audit)
-- ---------------------------------------------------------------------------

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
  v_join_default_role text;
  v_version integer;
  v_slug text;
  v_is_public boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.can_manage_club_public_page(v_uid, p_club_id) then
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
  v_join_default_role := nullif(trim(both from ob->>'join_default_role'), '');

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
    join_default_role = case
      when v_join_default_role in (
        'admin', 'trainer', 'player', 'staff', 'member', 'parent',
        'sponsor', 'supplier', 'service_provider', 'consultant'
      ) then v_join_default_role::public.app_role
      else c.join_default_role
    end,
    join_default_team = nullif(trim(both from ob->>'join_default_team'), ''),
    join_auto_approve_invited_only = case
      when ob ? 'join_auto_approve_invited_only' then (ob->>'join_auto_approve_invited_only')::boolean
      else coalesce(c.join_auto_approve_invited_only, false)
    end,
    public_page_sections = coalesce(psec, c.public_page_sections),
    public_page_published_config = v_draft,
    public_page_published_at = now(),
    public_page_published_by = v_uid,
    public_page_publish_version = coalesce(c.public_page_publish_version, 0) + 1
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  select cc.public_page_publish_version, cc.slug, cc.is_public
  into v_version, v_slug, v_is_public
  from public.clubs cc
  where cc.id = p_club_id;

  insert into public.club_public_page_audit_events (
    club_id, event_type, summary, detail, actor_user_id
  )
  values (
    p_club_id,
    'page_published',
    'Published club website',
    jsonb_build_object(
      'version', v_version,
      'slug', v_slug,
      'is_public', v_is_public
    ),
    v_uid
  );

  return jsonb_build_object(
    'ok', true,
    'club_id', p_club_id,
    'published_at', now(),
    'version', v_version
  );
end;
$$;

grant execute on function public.publish_club_public_page_config(uuid) to authenticated;

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
  if not public.can_manage_club_public_page(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  update public.clubs c
  set is_public = false
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  insert into public.club_public_page_audit_events (
    club_id, event_type, summary, detail, actor_user_id
  )
  values (
    p_club_id,
    'page_unpublished',
    'Hid public club website',
    '{}'::jsonb,
    v_uid
  );

  return jsonb_build_object('ok', true, 'club_id', p_club_id);
end;
$$;

revoke all on function public.unpublish_club_public_website(uuid) from public;
grant execute on function public.unpublish_club_public_website(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Shop audit triggers
-- ---------------------------------------------------------------------------

create or replace function public.trg_shop_products_audit()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_detail jsonb := '{}'::jsonb;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.club_shop_audit_events (
      club_id, product_id, event_type, summary, detail, actor_user_id
    )
    values (
      new.club_id,
      new.id,
      'product_created',
      coalesce(nullif(trim(new.name), ''), 'Product created'),
      jsonb_build_object(
        'name', new.name,
        'price_eur', new.price_eur,
        'is_active', new.is_active
      ),
      v_actor
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.name is distinct from new.name then
      v_detail := v_detail || jsonb_build_object('name', jsonb_build_object('from', old.name, 'to', new.name));
    end if;
    if old.price_eur is distinct from new.price_eur then
      v_detail := v_detail || jsonb_build_object('price_eur', jsonb_build_object('from', old.price_eur, 'to', new.price_eur));
    end if;
    if old.stock is distinct from new.stock then
      v_detail := v_detail || jsonb_build_object('stock', jsonb_build_object('from', old.stock, 'to', new.stock));
    end if;
    if old.is_active is distinct from new.is_active then
      v_detail := v_detail || jsonb_build_object('is_active', jsonb_build_object('from', old.is_active, 'to', new.is_active));
    end if;
    if old.description is distinct from new.description then
      v_detail := v_detail || jsonb_build_object('description_changed', true);
    end if;
    if old.category_id is distinct from new.category_id then
      v_detail := v_detail || jsonb_build_object(
        'category_id', jsonb_build_object('from', old.category_id, 'to', new.category_id)
      );
    end if;

    if v_detail = '{}'::jsonb then
      return new;
    end if;

    insert into public.club_shop_audit_events (
      club_id, product_id, event_type, summary, detail, actor_user_id
    )
    values (
      new.club_id,
      new.id,
      'product_updated',
      coalesce(nullif(trim(new.name), ''), 'Product updated'),
      v_detail,
      v_actor
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.club_shop_audit_events (
      club_id, product_id, event_type, summary, detail, actor_user_id
    )
    values (
      old.club_id,
      old.id,
      'product_deleted',
      coalesce(nullif(trim(old.name), ''), 'Product deleted'),
      jsonb_build_object('name', old.name, 'price_eur', old.price_eur),
      v_actor
    );
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists shop_products_audit_iud on public.shop_products;
create trigger shop_products_audit_iud
  after insert or update or delete on public.shop_products
  for each row execute function public.trg_shop_products_audit();

create or replace function public.trg_shop_categories_audit()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.club_shop_audit_events (
      club_id, category_id, event_type, summary, detail, actor_user_id
    )
    values (
      new.club_id,
      new.id,
      'category_created',
      coalesce(nullif(trim(new.name), ''), 'Category created'),
      jsonb_build_object('name', new.name, 'is_active', new.is_active),
      v_actor
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.name is distinct from new.name or old.is_active is distinct from new.is_active then
      insert into public.club_shop_audit_events (
        club_id, category_id, event_type, summary, detail, actor_user_id
      )
      values (
        new.club_id,
        new.id,
        'category_updated',
        coalesce(nullif(trim(new.name), ''), 'Category updated'),
        jsonb_build_object(
          'name', case when old.name is distinct from new.name then jsonb_build_object('from', old.name, 'to', new.name) else null end,
          'is_active', case when old.is_active is distinct from new.is_active then jsonb_build_object('from', old.is_active, 'to', new.is_active) else null end
        ),
        v_actor
      );
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.club_shop_audit_events (
      club_id, category_id, event_type, summary, detail, actor_user_id
    )
    values (
      old.club_id,
      old.id,
      'category_deleted',
      coalesce(nullif(trim(old.name), ''), 'Category deleted'),
      jsonb_build_object('name', old.name),
      v_actor
    );
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists shop_categories_audit_iud on public.shop_categories;
create trigger shop_categories_audit_iud
  after insert or update or delete on public.shop_categories
  for each row execute function public.trg_shop_categories_audit();

create or replace function public.trg_shop_orders_audit()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.club_shop_audit_events (
      club_id, product_id, event_type, summary, detail, actor_user_id
    )
    values (
      new.club_id,
      new.product_id,
      'order_status_updated',
      'Order status updated',
      jsonb_build_object(
        'order_id', new.id,
        'status', jsonb_build_object('from', old.status, 'to', new.status),
        'quantity', new.quantity,
        'total_eur', new.total_eur
      ),
      v_actor
    );
  end if;
  return new;
end;
$$;

drop trigger if exists shop_orders_audit_u on public.shop_orders;
create trigger shop_orders_audit_u
  after update on public.shop_orders
  for each row execute function public.trg_shop_orders_audit();

notify pgrst, 'reload schema';
