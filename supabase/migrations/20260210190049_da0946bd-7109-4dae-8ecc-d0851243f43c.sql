
-- Function to create a club and assign the creator as admin in one transaction
-- Uses SECURITY DEFINER to bypass RLS for the initial membership creation
CREATE OR REPLACE FUNCTION public.create_club_with_admin(
  _name TEXT,
  _slug TEXT,
  _description TEXT DEFAULT NULL,
  _is_public BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _club_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Club name is required';
  END IF;
  IF length(_name) > 100 THEN
    RAISE EXCEPTION 'Club name must be under 100 characters';
  END IF;
  IF _description IS NOT NULL AND length(_description) > 500 THEN
    RAISE EXCEPTION 'Description must be under 500 characters';
  END IF;

  -- Create club
  INSERT INTO public.clubs (name, slug, description, is_public)
  VALUES (trim(_name), _slug, trim(_description), _is_public)
  RETURNING id INTO _club_id;

  -- Create admin membership
  INSERT INTO public.club_memberships (club_id, user_id, role, status)
  VALUES (_club_id, _user_id, 'admin', 'active');

  RETURN _club_id;
END;
$$;
