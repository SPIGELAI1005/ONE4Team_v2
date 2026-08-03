-- Patch eventsHighlight on draft + published snapshot (same access as events timeline feed).

create or replace function public.patch_club_events_highlight(
  p_club_id uuid,
  p_highlight jsonb
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
  v_highlight jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.can_manage_club_events_feed(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  v_highlight := coalesce(p_highlight, '{}'::jsonb);

  select d.config into v_draft
  from public.club_public_page_drafts d
  where d.club_id = p_club_id;

  v_draft := coalesce(v_draft, '{}'::jsonb) || jsonb_build_object('eventsHighlight', v_highlight);

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
    coalesce(v_published, '{}'::jsonb) || jsonb_build_object('eventsHighlight', v_highlight)
  where c.id = p_club_id;

  if not found then
    raise exception 'club_not_found';
  end if;

  select coalesce(array_agg(k order by k), '{}'::text[])
  into v_keys
  from jsonb_object_keys(v_highlight) as k;

  insert into public.club_public_page_audit_events (
    club_id, event_type, summary, detail, actor_user_id
  )
  values (
    p_club_id,
    'events_highlight_saved',
    'Saved events hero highlight',
    jsonb_build_object(
      'highlight_keys', to_jsonb(v_keys),
      'enabled', coalesce((v_highlight->>'enabled')::boolean, false)
    ),
    v_uid
  );

  return jsonb_build_object(
    'ok', true,
    'club_id', p_club_id,
    'enabled', coalesce((v_highlight->>'enabled')::boolean, false)
  );
end;
$$;

revoke all on function public.patch_club_events_highlight(uuid, jsonb) from public;
grant execute on function public.patch_club_events_highlight(uuid, jsonb) to authenticated;

comment on function public.patch_club_events_highlight(uuid, jsonb) is
  'Merge eventsHighlight into club page draft and published JSON for Events/Matches hero strip.';
