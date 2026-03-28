-- Timeline for saved-list (draft) entries: events by draft_id or matching correlation email.

create or replace function public.get_club_member_audit_timeline_for_draft(_club_id uuid, _draft_id uuid)
returns table (
  id uuid,
  event_type text,
  summary text,
  detail jsonb,
  actor_user_id uuid,
  created_at timestamptz,
  correlation_email text,
  membership_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not (
    public.is_club_admin(auth.uid(), _club_id)
    or public.is_club_trainer(auth.uid(), _club_id)
  ) then
    raise exception 'Not authorized';
  end if;

  select lower(trim(coalesce(d.email, ''))) into v_email
  from public.club_member_drafts d
  where d.id = _draft_id
    and d.club_id = _club_id;

  return query
  select
    e.id,
    e.event_type,
    e.summary,
    e.detail,
    e.actor_user_id,
    e.created_at,
    e.correlation_email,
    e.membership_id
  from public.club_member_audit_events e
  where e.club_id = _club_id
    and (
      e.draft_id = _draft_id
      or (
        v_email is not null
        and v_email <> ''
        and e.correlation_email is not null
        and e.correlation_email = v_email
      )
    )
  order by e.created_at desc
  limit 250;
end;
$$;

revoke all on function public.get_club_member_audit_timeline_for_draft(uuid, uuid) from public;
grant execute on function public.get_club_member_audit_timeline_for_draft(uuid, uuid) to authenticated;
