
-- ============ TEAMS TABLE ============
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT DEFAULT 'Football',
  age_group TEXT,
  coach_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Teams RLS
CREATE POLICY "Members can view club teams" ON public.teams FOR SELECT TO authenticated
  USING (public.is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can manage teams" ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- ============ TEAM PLAYERS (assignment) ============
CREATE TABLE public.team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.club_memberships(id) ON DELETE CASCADE NOT NULL,
  jersey_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, membership_id)
);
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view team players" ON public.team_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.is_member_of_club(auth.uid(), t.club_id)));
CREATE POLICY "Admins can manage team players" ON public.team_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.is_club_admin(auth.uid(), t.club_id)));
CREATE POLICY "Admins can update team players" ON public.team_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.is_club_admin(auth.uid(), t.club_id)));
CREATE POLICY "Admins can delete team players" ON public.team_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.is_club_admin(auth.uid(), t.club_id)));

-- ============ TRAINING SESSIONS ============
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  recurring TEXT, -- 'weekly', 'biweekly', null
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_training_sessions_updated_at BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Members can view training sessions" ON public.training_sessions FOR SELECT TO authenticated
  USING (public.is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins/trainers can create sessions" ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can update sessions" ON public.training_sessions FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete sessions" ON public.training_sessions FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Members can view announcements" ON public.announcements FOR SELECT TO authenticated
  USING (public.is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) AND author_id = auth.uid());
CREATE POLICY "Authors can update announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Members can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_club(auth.uid(), club_id) AND sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ MEMBERSHIP FEES ============
CREATE TABLE public.membership_fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  interval TEXT DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly', 'one_time'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.membership_fee_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view fee types" ON public.membership_fee_types FOR SELECT TO authenticated
  USING (public.is_member_of_club(auth.uid(), club_id));
CREATE POLICY "Admins can manage fee types" ON public.membership_fee_types FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can update fee types" ON public.membership_fee_types FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can delete fee types" ON public.membership_fee_types FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.club_memberships(id) ON DELETE CASCADE NOT NULL,
  fee_type_id UUID REFERENCES public.membership_fee_types(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'online'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Members can view own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.club_memberships cm WHERE cm.id = membership_id AND cm.user_id = auth.uid()));
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can create payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can delete payments" ON public.payments FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
