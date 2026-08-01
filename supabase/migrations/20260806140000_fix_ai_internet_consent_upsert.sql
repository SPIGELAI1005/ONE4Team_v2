-- Fix consent save: PostgREST upsert (INSERT … ON CONFLICT DO UPDATE) needs UPDATE RLS too.

drop policy if exists ai_internet_consents_update_own on public.ai_internet_consents;
create policy ai_internet_consents_update_own
  on public.ai_internet_consents for update to authenticated
  using (
    auth.uid() = user_id
    and public.is_member_of_club(auth.uid(), club_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_member_of_club(auth.uid(), club_id)
  );

create or replace function public.record_ai_internet_consent(_club_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if not public.is_member_of_club(auth.uid(), _club_id) then
    return false;
  end if;

  insert into public.ai_internet_consents (user_id, club_id, consented_at)
  values (auth.uid(), _club_id, now())
  on conflict (user_id, club_id) do update
    set consented_at = excluded.consented_at;

  return true;
end;
$$;

grant execute on function public.record_ai_internet_consent(uuid) to authenticated;
