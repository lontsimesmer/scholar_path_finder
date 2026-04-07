ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS profile_validation_comment TEXT,
  ADD COLUMN IF NOT EXISTS profile_invalidated_at TIMESTAMP WITH TIME ZONE;
