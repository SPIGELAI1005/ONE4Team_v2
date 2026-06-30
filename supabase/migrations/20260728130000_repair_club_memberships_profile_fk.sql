-- Repair: club_memberships → profiles FK for PostgREST embeds
-- (profiles!club_memberships_profile_fk used across Members, Payments, Dues, etc.)

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'club_memberships_profile_fk'
  ) then
    alter table public.club_memberships
      add constraint club_memberships_profile_fk
      foreign key (user_id) references public.profiles(user_id)
      on delete cascade
      not valid;
  end if;
exception
  when others then
    raise notice 'club_memberships_profile_fk add skipped: %', sqlerrm;
end $$;

do $$
begin
  alter table public.club_memberships validate constraint club_memberships_profile_fk;
exception
  when others then
    raise notice 'club_memberships_profile_fk validate skipped (orphan user_ids?): %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
