-- Add medical/safety and onboarding/performance fields to club_member_master_records (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'allergies'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN allergies text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'medical_conditions'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN medical_conditions text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'medications'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN medications text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'medical_notes'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN medical_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'onboarding_progress'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN onboarding_progress text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'team_integration_status'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN team_integration_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'squad_status'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN squad_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_member_master_records'
      AND column_name = 'last_evaluation_date'
  ) THEN
    ALTER TABLE public.club_member_master_records ADD COLUMN last_evaluation_date date;
  END IF;
END $$;

