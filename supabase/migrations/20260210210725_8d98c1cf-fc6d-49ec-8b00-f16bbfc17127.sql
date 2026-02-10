
-- Allow public read access to matches for public clubs (for live scores page)
CREATE POLICY "Public can view matches of public clubs"
  ON public.matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = matches.club_id AND c.is_public = true
    )
  );

-- Allow public read access to teams for public clubs (to show team names)
CREATE POLICY "Public can view teams of public clubs"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = teams.club_id AND c.is_public = true
    )
  );

-- Allow any club member to insert notifications (for admin sender to fan out)
CREATE POLICY "Members can insert notifications for their club"
  ON public.notifications FOR INSERT
  WITH CHECK (
    is_member_of_club(auth.uid(), club_id)
  );
