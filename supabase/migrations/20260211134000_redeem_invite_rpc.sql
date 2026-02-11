-- Phase 1.5: invite redemption RPC (server-side verification)
-- Security model:
-- - raw invite token never stored; client sends token, we hash and look up token_hash
-- - RPC is SECURITY DEFINER to allow insert into club_memberships while keeping RLS strict
-- - Enforces: unused, not expired, optional email match

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _token is null or length(trim(_token)) < 10 then
    raise exception 'Invalid token';
  end if;

  -- Hash token (SHA-256) in Postgres
  -- requires pgcrypto extension
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

  -- Optional email lock
  if v_inv.email is not null then
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    if v_email = '' or v_email <> lower(v_inv.email) then
      raise exception 'Invite email mismatch';
    end if;
  end if;

  -- Upsert membership
  insert into public.club_memberships (club_id, user_id, role, status)
  values (v_inv.club_id, v_user_id, v_inv.role, 'active')
  on conflict (club_id, user_id)
  do update set role = excluded.role, status = 'active';

  update public.club_invites
  set used_at = now()
  where id = v_inv.id;

  club_id := v_inv.club_id;
  role := v_inv.role;
  return next;
end;
$$;

-- Allow authenticated users to execute
revoke all on function public.redeem_club_invite(text) from public;
grant execute on function public.redeem_club_invite(text) to authenticated;
