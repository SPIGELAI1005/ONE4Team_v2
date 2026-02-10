
-- Fix overly permissive ALL policies by replacing with specific operations

-- player_match_stats: drop ALL and create specific policies
DROP POLICY "Admins can manage stats" ON public.player_match_stats;

CREATE POLICY "Admins can insert stats" ON public.player_match_stats
  FOR INSERT WITH CHECK (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can update stats" ON public.player_match_stats
  FOR UPDATE USING (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can delete stats" ON public.player_match_stats
  FOR DELETE USING (is_club_admin(auth.uid(), club_id));

-- custom_stat_definitions: drop ALL and create specific policies
DROP POLICY "Admins can manage stat definitions" ON public.custom_stat_definitions;

CREATE POLICY "Admins can insert stat definitions" ON public.custom_stat_definitions
  FOR INSERT WITH CHECK (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can update stat definitions" ON public.custom_stat_definitions
  FOR UPDATE USING (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can delete stat definitions" ON public.custom_stat_definitions
  FOR DELETE USING (is_club_admin(auth.uid(), club_id));

-- season_awards: drop ALL and create specific policies
DROP POLICY "Admins can manage awards" ON public.season_awards;

CREATE POLICY "Admins can insert awards" ON public.season_awards
  FOR INSERT WITH CHECK (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can update awards" ON public.season_awards
  FOR UPDATE USING (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can delete awards" ON public.season_awards
  FOR DELETE USING (is_club_admin(auth.uid(), club_id));
