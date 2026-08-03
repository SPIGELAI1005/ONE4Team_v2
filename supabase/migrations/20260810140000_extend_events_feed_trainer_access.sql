-- Allow club trainers to save the events timeline feed (matches EventsFeedAdmin UI for isTrainer).

create or replace function public.can_manage_club_events_feed(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_club_public_page(_user_id, _club_id)
    or public.is_club_trainer(_user_id, _club_id);
$$;

revoke all on function public.can_manage_club_events_feed(uuid, uuid) from public;
grant execute on function public.can_manage_club_events_feed(uuid, uuid) to authenticated;

comment on function public.can_manage_club_events_feed(uuid, uuid) is
  'Club admins, Team Management, and assigned trainers may edit the shared events timeline feed.';

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
  v_feed jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.can_manage_club_events_feed(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  v_feed := coalesce(p_feed, '{}'::jsonb) || jsonb_build_object('enabled', true);

  select d.config into v_draft
  from public.club_public_page_drafts d
  where d.club_id = p_club_id;

  v_draft := coalesce(v_draft, '{}'::jsonb) || jsonb_build_object('eventsFeed', v_feed);

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
    coalesce(v_published, '{}'::jsonb) || jsonb_build_object('eventsFeed', v_feed)
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  select coalesce(array_agg(k order by k), '{}'::text[])
  into v_keys
  from jsonb_object_keys(v_feed) as k;

  insert into public.club_public_page_audit_events (
    club_id, event_type, summary, detail, actor_user_id
  )
  values (
    p_club_id,
    'events_feed_saved',
    'Saved events timeline feed',
    jsonb_build_object(
      'feed_keys', to_jsonb(v_keys),
      'item_count', coalesce(jsonb_array_length(v_feed->'items'), 0)
    ),
    v_uid
  );

  return jsonb_build_object(
    'ok', true,
    'club_id', p_club_id,
    'item_count', coalesce(jsonb_array_length(v_feed->'items'), 0)
  );
end;
$$;

revoke all on function public.patch_club_events_feed(uuid, jsonb) from public;
grant execute on function public.patch_club_events_feed(uuid, jsonb) to authenticated;

comment on function public.patch_club_events_feed(uuid, jsonb) is
  'Merge eventsFeed into club page draft and published JSON (including empty item lists).';
