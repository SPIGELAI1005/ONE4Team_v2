-- Grant George Neacsu (spigelai@gmail.com) all dashboard personas for QA.
-- Run: supabase db query -f supabase/scripts/grant_all_roles_spigelai.sql
-- Idempotent — safe to re-run.

do $grant$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_membership_id uuid;
  v_display_name text := 'George Neacsu';
  v_kind text;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower('spigelai@gmail.com')
  limit 1;

  if v_user_id is null then
    raise exception 'User spigelai@gmail.com not found in auth.users';
  end if;

  select c.id into v_club_id
  from public.clubs c
  where c.slug = 'tsv-allach-09'
     or c.name ilike '%TSV Allach%'
  order by case when c.slug = 'tsv-allach-09' then 0 else 1 end
  limit 1;

  if v_club_id is null then
    raise exception 'TSV Allach club not found';
  end if;

  insert into public.profiles (user_id, display_name)
  values (v_user_id, v_display_name)
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  select m.id into v_membership_id
  from public.club_memberships m
  where m.club_id = v_club_id
    and m.user_id = v_user_id
    and m.status = 'active'
  order by case when m.role = 'admin' then 0 else 1 end, m.created_at
  limit 1;

  if v_membership_id is null then
    insert into public.club_memberships (club_id, user_id, role, status)
    values (v_club_id, v_user_id, 'admin'::public.app_role, 'active')
    returning id into v_membership_id;
  else
    update public.club_memberships
    set role = 'admin'::public.app_role,
        status = 'active',
        updated_at = now()
    where id = v_membership_id;
  end if;

  -- Scoped assignments on every active membership for this user (dual-club QA).
  foreach v_kind in array array[
    'club_admin', 'trainer', 'player', 'parent', 'staff', 'member',
    'sponsor', 'supplier', 'service_provider', 'consultant'
  ]
  loop
    insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
    select m.club_id, m.id, v_kind, 'club', null
    from public.club_memberships m
    where m.user_id = v_user_id
      and m.status = 'active'
      and not exists (
        select 1
        from public.club_role_assignments x
        where x.membership_id = m.id
          and x.role_kind = v_kind
          and x.scope = 'club'
          and x.scope_team_id is null
      );
  end loop;

  insert into public.marketplace_provider_profiles (
    owner_user_id,
    provider_type,
    provider_name,
    slug,
    short_description,
    visibility,
    listing_status
  )
  select
    v_user_id,
    t.provider_type,
    v_display_name || ' — ' || initcap(replace(t.provider_type, '_', ' ')),
    'spigelai-' || replace(t.provider_type, '_', '-'),
    'QA listing for partner portal testing.',
    'private',
    'draft'
  from (
    values
      ('supplier'),
      ('service_provider'),
      ('consultant'),
      ('sponsor')
  ) as t(provider_type)
  where not exists (
    select 1
    from public.marketplace_provider_profiles p
    where p.owner_user_id = v_user_id
      and p.provider_type = t.provider_type
  );

  raise notice 'Granted all roles to % (user %, club %, membership %)',
    'spigelai@gmail.com', v_user_id, v_club_id, v_membership_id;
end;
$grant$;
