-- Public preview for admin-created member invites (token in email link).
-- Lets invitees see pre-filled member data before sign-up and redeem.

create or replace function public.preview_club_invite(
  _token text,
  _club_slug text default null
)
returns table (
  ok boolean,
  error_code text,
  club_id uuid,
  club_name text,
  club_slug text,
  email text,
  role public.app_role,
  member_name text,
  first_name text,
  last_name text,
  team text,
  age_group text,
  member_position text,
  expires_at timestamptz,
  used_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_inv public.club_invites%rowtype;
  v_club public.clubs%rowtype;
  v_fn text;
  v_ln text;
  v_name text;
begin
  ok := false;
  error_code := null;

  if _token is null or length(trim(_token)) < 10 then
    error_code := 'invalid_token';
    return next;
    return;
  end if;

  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  select * into v_inv
  from public.club_invites
  where token_hash = v_hash
  limit 1;

  if not found then
    error_code := 'not_found';
    return next;
    return;
  end if;

  select * into v_club
  from public.clubs
  where id = v_inv.club_id;

  if _club_slug is not null and length(trim(_club_slug)) > 0 then
    if v_club.slug is distinct from trim(_club_slug) then
      error_code := 'club_mismatch';
      return next;
      return;
    end if;
  end if;

  if v_inv.used_at is not null then
    error_code := 'already_used';
    return next;
    return;
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at <= now() then
    error_code := 'expired';
    return next;
    return;
  end if;

  v_fn := nullif(trim(coalesce(v_inv.invite_payload ->> 'first_name', '')), '');
  v_ln := nullif(trim(coalesce(v_inv.invite_payload ->> 'last_name', '')), '');
  v_name := nullif(trim(coalesce(v_inv.invite_payload ->> 'name', '')), '');

  if v_fn is null and v_ln is null and v_name is not null then
    v_fn := split_part(v_name, ' ', 1);
    if strpos(v_name, ' ') > 0 then
      v_ln := nullif(trim(substring(v_name from strpos(v_name, ' ') + 1)), '');
    end if;
  end if;

  ok := true;
  club_id := v_inv.club_id;
  club_name := v_club.name;
  club_slug := v_club.slug;
  email := v_inv.email;
  role := v_inv.role;
  member_name := coalesce(v_name, nullif(trim(concat_ws(' ', v_fn, v_ln)), ''));
  first_name := v_fn;
  last_name := v_ln;
  team := nullif(trim(coalesce(v_inv.invite_payload ->> 'team', '')), '');
  age_group := nullif(trim(coalesce(v_inv.invite_payload ->> 'age_group', '')), '');
  member_position := nullif(trim(coalesce(v_inv.invite_payload ->> 'position', '')), '');
  expires_at := v_inv.expires_at;
  used_at := v_inv.used_at;

  return next;
end;
$$;

revoke all on function public.preview_club_invite(text, text) from public;
grant execute on function public.preview_club_invite(text, text) to anon, authenticated;
