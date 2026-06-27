-- Remove stale announcement notifications whose announcement row no longer exists.

delete from public.notifications n
where n.notification_type = 'announcement'
  and n.reference_id is not null
  and not exists (
    select 1
    from public.announcements a
    where a.id = n.reference_id
  );
