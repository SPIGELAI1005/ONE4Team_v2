
-- ===========================================
-- EVENTS & TOURNAMENTS
-- ===========================================

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event', -- 'event', 'tournament'
  location TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view events" ON public.events FOR SELECT USING (is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can create events" ON public.events FOR INSERT WITH CHECK (is_club_admin(auth.uid(), club_id) AND created_by = auth.uid());
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (is_club_admin(auth.uid(), club_id));

CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited', -- 'invited', 'confirmed', 'declined', 'attended'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, membership_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view participants" ON public.event_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_member_of_club(auth.uid(), e.club_id)));
CREATE POLICY "Admins can manage participants" ON public.event_participants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_club_admin(auth.uid(), e.club_id)));
CREATE POLICY "Members can update own participation" ON public.event_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM club_memberships cm WHERE cm.id = membership_id AND cm.user_id = auth.uid()));
CREATE POLICY "Admins can delete participants" ON public.event_participants FOR DELETE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_club_admin(auth.uid(), e.club_id)));

-- ===========================================
-- COMPETITIONS & MATCHES
-- ===========================================

CREATE TABLE public.competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season TEXT, -- e.g. '2025/2026'
  competition_type TEXT NOT NULL DEFAULT 'league', -- 'league', 'cup', 'friendly'
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view competitions" ON public.competitions FOR SELECT USING (is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can create competitions" ON public.competitions FOR INSERT WITH CHECK (is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can update competitions" ON public.competitions FOR UPDATE USING (is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can delete competitions" ON public.competitions FOR DELETE USING (is_club_admin(auth.uid(), club_id));

CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  opponent TEXT NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT true,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  home_score INTEGER,
  away_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view matches" ON public.matches FOR SELECT USING (is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can create matches" ON public.matches FOR INSERT WITH CHECK (is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can update matches" ON public.matches FOR UPDATE USING (is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can delete matches" ON public.matches FOR DELETE USING (is_club_admin(auth.uid(), club_id));

CREATE TABLE public.match_lineups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  position TEXT,
  is_starter BOOLEAN NOT NULL DEFAULT true,
  jersey_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, membership_id)
);

ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lineups" ON public.match_lineups FOR SELECT
  USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_member_of_club(auth.uid(), m.club_id)));
CREATE POLICY "Admins can manage lineups" ON public.match_lineups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_club_admin(auth.uid(), m.club_id)));
CREATE POLICY "Admins can update lineups" ON public.match_lineups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_club_admin(auth.uid(), m.club_id)));
CREATE POLICY "Admins can delete lineups" ON public.match_lineups FOR DELETE
  USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_club_admin(auth.uid(), m.club_id)));

CREATE TABLE public.match_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.club_memberships(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'goal', 'assist', 'yellow_card', 'red_card', 'substitution_in', 'substitution_out'
  minute INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view match events" ON public.match_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_member_of_club(auth.uid(), m.club_id)));
CREATE POLICY "Admins can create match events" ON public.match_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_club_admin(auth.uid(), m.club_id)));
CREATE POLICY "Admins can update match events" ON public.match_events FOR UPDATE
  USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_club_admin(auth.uid(), m.club_id)));
CREATE POLICY "Admins can delete match events" ON public.match_events FOR DELETE
  USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND is_club_admin(auth.uid(), m.club_id)));

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON public.event_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
