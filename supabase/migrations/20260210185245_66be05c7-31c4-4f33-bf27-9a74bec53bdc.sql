
-- Allow authenticated users to create new clubs
CREATE POLICY "Authenticated users can create clubs"
  ON public.clubs FOR INSERT
  TO authenticated
  WITH CHECK (true);
