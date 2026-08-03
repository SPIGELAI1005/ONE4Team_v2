-- Admin-gated draft upsert (security definer) so client saves do not rely on direct RLS INSERT.

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
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_club_admin(v_uid, p_club_id) then
    raise exception 'not_authorized';
  end if;

  insert into public.club_public_page_drafts (club_id, config, updated_by)
  values (p_club_id, coalesce(p_config, '{}'::jsonb), v_uid)
  on conflict (club_id) do update
    set config = excluded.config,
        updated_by = excluded.updated_by,
        updated_at = now();

  return jsonb_build_object('ok', true, 'club_id', p_club_id);
end;
$$;

grant execute on function public.upsert_club_public_page_draft(uuid, jsonb) to authenticated;

comment on function public.upsert_club_public_page_draft(uuid, jsonb) is
  'Create or update club_public_page_drafts for club admins; used by Club Page Admin save.';
