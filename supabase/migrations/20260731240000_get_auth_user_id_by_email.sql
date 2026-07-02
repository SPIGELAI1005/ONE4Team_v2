-- Service-role helper for invite signup edge function (lookup existing auth users by email).

create or replace function public.get_auth_user_id_by_email(_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(_email, '')))
  limit 1;
$$;

revoke all on function public.get_auth_user_id_by_email(text) from public;
grant execute on function public.get_auth_user_id_by_email(text) to service_role;
