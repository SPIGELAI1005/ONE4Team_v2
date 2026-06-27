-- Club admins manage announcements; message senders may delete anytime and edit within 15 minutes.

drop policy if exists "Authors can update announcements" on public.announcements;
drop policy if exists "Admins can update announcements" on public.announcements;
create policy "Admins can update announcements"
  on public.announcements
  for update
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can delete announcements"
  on public.announcements
  for delete
  to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "Senders can delete own messages" on public.messages;
create policy "Senders can delete own messages"
  on public.messages
  for delete
  to authenticated
  using (
    sender_id = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
  );

drop policy if exists "Senders can edit recent own messages" on public.messages;
create policy "Senders can edit recent own messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
    and created_at > (now() - interval '15 minutes')
  )
  with check (
    sender_id = auth.uid()
    and public.is_member_of_club(auth.uid(), club_id)
    and created_at > (now() - interval '15 minutes')
  );

notify pgrst, 'reload schema';
