-- Create achievements table for badges and milestones
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- e.g. 'goals_10', 'matches_50', 'attendance_streak_5'
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT '🏅',
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(membership_id, badge_type)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view achievements in their club"
ON public.achievements FOR SELECT
TO authenticated
USING (public.is_member_of_club(auth.uid(), club_id));

CREATE POLICY "Admins can manage achievements"
ON public.achievements FOR ALL
TO authenticated
USING (public.is_club_admin(auth.uid(), club_id));

CREATE INDEX idx_achievements_membership ON public.achievements(membership_id);
CREATE INDEX idx_achievements_club ON public.achievements(club_id);