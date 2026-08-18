-- Phase 19: Realtime for checklist items + guest participants (selective).
do $$
declare
  t text;
begin
  foreach t in array array[
    'club_task_checklist_items',
    'activity_guest_participants'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_publication p on p.oid = pr.prpubid
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
