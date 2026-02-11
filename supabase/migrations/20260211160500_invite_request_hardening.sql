-- Hardening: invite requests anti-spam + admin delete policy for invites
-- Goal:
--  - remove public direct INSERT to club_invite_requests
--  - provide SECURITY DEFINER RPC that enforces:
--      * club is public
--      * max 3 requests per (club_id,email) per 24h
--      * at most 1 pending request per (club_id,email)
--  - allow admins to delete invites (revoke)

-- ============================================================
-- 1) Admin revoke (delete) invites
-- ============================================================
create policy if not exists "club_invites_delete_admin"
  on public.club_invites for delete
  using (public.is_club_admin(club_id::text, auth.uid()::text));

-- ============================================================
-- 2) Invite request funnel: RPC-only inserts
-- ============================================================
-- Drop the public insert policy so anon cannot spam the table directly.
-- (The RPC below will insert as the function owner.)
drop policy if exists "club_invite_requests_insert_public" on public.club_invite_requests;

-- Enforce one pending request per email+club at a time
create unique index if not exists uq_club_invite_requests_pending
  on public.club_invite_requests (club_id, lower(email))
  where status = 'pending';

-- Helper RPC
create or replace function public.request_club_invite(
  _club_id uuid,
  _name text,
  _email text,
  _message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_email text;
  v_count int;
  v_id uuid;
begin
  if _club_id is null then
    raise exception 'Missing club id';
  end if;

  select c.is_public into v_is_public
  from public.clubs c
  where c.id = _club_id;

  if v_is_public is distinct from true then
    raise exception 'This club is not accepting public invite requests';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'Name is required';
  end if;

  v_email := lower(trim(coalesce(_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Valid email is required';
  end if;

  -- Rate limit: max 3 requests per email per club per 24h
  select count(*) into v_count
  from public.club_invite_requests r
  where r.club_id = _club_id
    and lower(r.email) = v_email
    and r.created_at > now() - interval '24 hours';

  if v_count >= 3 then
    raise exception 'Too many requests. Please try again later.';
  end if;

  insert into public.club_invite_requests (club_id, name, email, message, status)
  values (_club_id, trim(_name), v_email, nullif(trim(coalesce(_message,'')),''), 'pending')
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this email.';
end;
$$;

revoke all on function public.request_club_invite(uuid, text, text, text) from public;
grant execute on function public.request_club_invite(uuid, text, text, text) to anon;
grant execute on function public.request_club_invite(uuid, text, text, text) to authenticated;
