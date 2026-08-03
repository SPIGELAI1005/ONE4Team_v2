-- Patch eventsFeed on draft + published snapshot for Team Management / club admins
-- (direct clubs UPDATE is admin-only RLS; trainers save via draft RPC only).

create or replace function public.patch_club_events_feed(
  p_club_id uuid,
  p_feed jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_draft jsonb;
  v_published jsonb;
  v_keys text[];
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

  v_draft := coalesce(v_draft, '{}'::jsonb) || jsonb_build_object('eventsFeed', coalesce(p_feed, '{}'::jsonb));

  insert into public.club_public_page_drafts (club_id, config, updated_by)
  values (p_club_id, v_draft, v_uid)
  on conflict (club_id) do update
    set config = excluded.config,
        updated_by = excluded.updated_by,
        updated_at = now();

  select c.public_page_published_config into v_published
  from public.clubs c
  where c.id = p_club_id;

  update public.clubs c
  set public_page_published_config =
    coalesce(v_published, '{}'::jsonb) || jsonb_build_object('eventsFeed', coalesce(p_feed, '{}'::jsonb))
  where c.id = p_club_id;

  select coalesce(array_agg(k order by k), '{}'::text[])
  into v_keys
  from jsonb_object_keys(coalesce(p_feed, '{}'::jsonb)) as k;

  insert into public.club_public_page_audit_events (
    club_id, event_type, summary, detail, actor_user_id
  )
  values (
    p_club_id,
    'events_feed_saved',
    'Saved events timeline feed',
    jsonb_build_object('feed_keys', to_jsonb(v_keys)),
    v_uid
  );

  return jsonb_build_object('ok', true, 'club_id', p_club_id);
end;
$$;

revoke all on function public.patch_club_events_feed(uuid, jsonb) from public;
grant execute on function public.patch_club_events_feed(uuid, jsonb) to authenticated;

comment on function public.patch_club_events_feed(uuid, jsonb) is
  'Merge eventsFeed into club page draft and published JSON for trainers/admins without full publish.';
