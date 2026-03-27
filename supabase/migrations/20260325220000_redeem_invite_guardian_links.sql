-- On invite redemption, create club_member_guardian_links from optional
-- invite_payload.guardian_membership_ids (JSON array of membership UUIDs), e.g. from saved drafts.

create or replace function public.redeem_club_invite(_token text)
returns table (
  club_id uuid,
  role public.app_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_inv public.club_invites%rowtype;
  v_user_id uuid;
  v_email text;
  v_team text;
  v_age_group text;
  v_position text;
  v_ward_id uuid;
  v_guardian_text text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _token is null or length(trim(_token)) < 10 then
    raise exception 'Invalid token';
  end if;

  v_hash := encode(digest(_token, 'sha256'), 'hex');

  select * into v_inv
  from public.club_invites
  where token_hash = v_hash
  limit 1;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_inv.used_at is not null then
    raise exception 'Invite already used';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'Invite expired';
  end if;

  if v_inv.email is not null then
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    if v_email = '' or v_email <> lower(v_inv.email) then
      raise exception 'Invite email mismatch';
    end if;
  end if;

  v_team := nullif(trim(coalesce(v_inv.invite_payload ->> 'team', '')), '');
  v_age_group := nullif(trim(coalesce(v_inv.invite_payload ->> 'age_group', '')), '');
  v_position := nullif(trim(coalesce(v_inv.invite_payload ->> 'position', '')), '');

  insert into public.club_memberships (club_id, user_id, role, status, team, age_group, position)
  values (v_inv.club_id, v_user_id, v_inv.role, 'active', v_team, v_age_group, v_position)
  on conflict (club_id, user_id)
  do update set
    role = excluded.role,
    status = 'active',
    team = coalesce(excluded.team, public.club_memberships.team),
    age_group = coalesce(excluded.age_group, public.club_memberships.age_group),
    position = coalesce(excluded.position, public.club_memberships.position);

  select cm.id into v_ward_id
  from public.club_memberships cm
  where cm.club_id = v_inv.club_id
    and cm.user_id = v_user_id
  limit 1;

  if v_ward_id is not null
     and jsonb_typeof(coalesce(v_inv.invite_payload -> 'guardian_membership_ids', '[]'::jsonb)) = 'array'
  then
    for v_guardian_text in
      select trim(t.elem)
      from jsonb_array_elements_text(
        coalesce(v_inv.invite_payload -> 'guardian_membership_ids', '[]'::jsonb)
      ) as t(elem)
    loop
      if v_guardian_text is null or length(v_guardian_text) = 0 then
        continue;
      end if;
      begin
        insert into public.club_member_guardian_links (
          club_id,
          guardian_membership_id,
          ward_membership_id,
          relationship
        )
        values (
          v_inv.club_id,
          v_guardian_text::uuid,
          v_ward_id,
          'guardian'
        )
        on conflict (club_id, guardian_membership_id, ward_membership_id) do nothing;
      exception
        when invalid_text_representation then
          null;
        when foreign_key_violation then
          null;
      end;
    end loop;
  end if;

  update public.club_invites
  set used_at = now()
  where id = v_inv.id;

  club_id := v_inv.club_id;
  role := v_inv.role;
  return next;
end;
$$;

revoke all on function public.redeem_club_invite(text) from public;
grant execute on function public.redeem_club_invite(text) to authenticated;
