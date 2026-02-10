
-- Player of the Match voting
CREATE TABLE public.match_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  voted_for_membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, voter_membership_id)
);

ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can vote in their club" ON public.match_votes
  FOR INSERT WITH CHECK (is_member_of_club(auth.uid(), club_id));

CREATE POLICY "Members can view votes in their club" ON public.match_votes
  FOR SELECT USING (is_member_of_club(auth.uid(), club_id));

CREATE POLICY "Members can update own vote" ON public.match_votes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM club_memberships cm WHERE cm.id = match_votes.voter_membership_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Members can delete own vote" ON public.match_votes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM club_memberships cm WHERE cm.id = match_votes.voter_membership_id AND cm.user_id = auth.uid())
  );

-- Player match stats for sport-specific tracking
CREATE TABLE public.player_match_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL,
  stat_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, membership_id, stat_name)
);

ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stats" ON public.player_match_stats
  FOR SELECT USING (is_member_of_club(auth.uid(), club_id));

CREATE POLICY "Admins can manage stats" ON public.player_match_stats
  FOR ALL USING (is_club_admin(auth.uid(), club_id));

-- Custom stat definitions per club/sport
CREATE TABLE public.custom_stat_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  sport TEXT NOT NULL DEFAULT 'Football',
  stat_name TEXT NOT NULL,
  stat_category TEXT NOT NULL DEFAULT 'general',
  stat_icon TEXT DEFAULT '📊',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, stat_name)
);

ALTER TABLE public.custom_stat_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stat definitions" ON public.custom_stat_definitions
  FOR SELECT USING (is_member_of_club(auth.uid(), club_id));

CREATE POLICY "Admins can manage stat definitions" ON public.custom_stat_definitions
  FOR ALL USING (is_club_admin(auth.uid(), club_id));

-- Season awards
CREATE TABLE public.season_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  award_type TEXT NOT NULL,
  award_name TEXT NOT NULL,
  award_icon TEXT DEFAULT '🏆',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, season, award_type)
);

ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view awards" ON public.season_awards
  FOR SELECT USING (is_member_of_club(auth.uid(), club_id));

CREATE POLICY "Admins can manage awards" ON public.season_awards
  FOR ALL USING (is_club_admin(auth.uid(), club_id));
