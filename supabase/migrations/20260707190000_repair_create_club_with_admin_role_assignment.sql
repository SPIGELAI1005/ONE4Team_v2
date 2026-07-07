-- Repair create_club_with_admin: stop double-inserting club_role_assignments.
--
-- trg_club_memberships_ensure_assignment (20260324140000) already inserts a
-- club-scoped assignment on every club_memberships INSERT. The enhanced
-- provisioning function (20260326110000) inserted the same row again, causing:
--   duplicate key value violates unique constraint
--   "idx_club_role_assignments_unique_club_self"
-- and HTTP 409 from PostgREST when onboarding calls create_club_with_admin.

CREATE OR REPLACE FUNCTION public.create_club_with_admin(
  _name TEXT,
  _slug TEXT,
  _description TEXT DEFAULT NULL,
  _is_public BOOLEAN DEFAULT true,
  _plan_id TEXT DEFAULT 'kickoff',
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _club_id UUID;
  _user_id UUID;
  _team_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Club name is required';
  END IF;
  IF length(_name) > 100 THEN
    RAISE EXCEPTION 'Club name must be under 100 characters';
  END IF;
  IF _description IS NOT NULL AND length(_description) > 500 THEN
    RAISE EXCEPTION 'Description must be under 500 characters';
  END IF;

  INSERT INTO public.clubs (
    name, slug, description, is_public,
    default_language, timezone, season_start_month
  )
  VALUES (
    trim(_name), _slug, trim(_description), _is_public,
    COALESCE(_metadata->>'language', 'en'),
    COALESCE(_metadata->>'timezone', 'Europe/Berlin'),
    COALESCE((_metadata->>'season_start_month')::int, 7)
  )
  RETURNING id INTO _club_id;

  -- Admin membership; trg_club_memberships_ensure_assignment seeds club_role_assignments.
  INSERT INTO public.club_memberships (club_id, user_id, role, status)
  VALUES (_club_id, _user_id, 'admin', 'active');

  BEGIN
    INSERT INTO public.teams (club_id, name, age_group, is_active)
    VALUES (_club_id, trim(_name) || ' - First Team', 'Senior', true)
    RETURNING id INTO _team_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.announcements (club_id, title, content, created_by)
    VALUES (
      _club_id,
      'Welcome to ' || trim(_name) || '!',
      'Your club has been created successfully on ONE4Team. Start by inviting your team members, setting up your teams, and configuring your club page.',
      _user_id
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.billing_subscriptions (club_id, plan_id, billing_cycle, status, metadata)
    VALUES (_club_id, _plan_id, 'monthly', 'trialing', _metadata)
    ON CONFLICT (club_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.shop_categories (club_id, name, is_active)
    VALUES
      (_club_id, 'Jerseys', true),
      (_club_id, 'Training Gear', true),
      (_club_id, 'Fan Articles', true),
      (_club_id, 'Accessories', true);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN _club_id;
END;
$$;
