-- Remove per-user notification rows when an announcement is deleted.

create or replace function public.cleanup_announcement_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where notification_type = 'announcement'
    and reference_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_announcement_notifications on public.announcements;
create trigger trg_cleanup_announcement_notifications
  before delete on public.announcements
  for each row
  execute function public.cleanup_announcement_notifications();

notify pgrst, 'reload schema';
