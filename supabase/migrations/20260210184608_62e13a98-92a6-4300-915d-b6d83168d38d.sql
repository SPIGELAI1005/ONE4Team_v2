
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM (
  'admin', 'trainer', 'player', 'staff', 'member', 'parent',
  'sponsor', 'supplier', 'service_provider', 'consultant'
);

-- 2. Clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#C4952A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Club memberships (roles per club)
CREATE TABLE public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  position TEXT,
  age_group TEXT,
  team TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id, role)
);

ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

-- 5. Helper functions (SECURITY DEFINER to avoid RLS recursion)

CREATE OR REPLACE FUNCTION public.is_member_of_club(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = _user_id AND club_id = _club_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = _user_id AND club_id = _club_id AND role = 'admin'
  )
$$;

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.club_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. RLS Policies

-- CLUBS
CREATE POLICY "Public clubs visible to everyone"
  ON public.clubs FOR SELECT
  USING (is_public = true);

CREATE POLICY "Members can see their clubs"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (public.is_member_of_club(auth.uid(), id));

CREATE POLICY "Admins can update their club"
  ON public.clubs FOR UPDATE
  TO authenticated
  USING (public.is_club_admin(auth.uid(), id));

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Club members can view fellow members profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships cm1
      JOIN public.club_memberships cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id
    )
  );

-- CLUB MEMBERSHIPS
CREATE POLICY "Users can view own memberships"
  ON public.club_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all club memberships"
  ON public.club_memberships FOR SELECT
  TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can add members"
  ON public.club_memberships FOR INSERT
  TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can update memberships"
  ON public.club_memberships FOR UPDATE
  TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

CREATE POLICY "Admins can remove members"
  ON public.club_memberships FOR DELETE
  TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
