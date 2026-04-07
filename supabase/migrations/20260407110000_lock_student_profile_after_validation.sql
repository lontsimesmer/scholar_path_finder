ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS profile_locked_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Students can update their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update their own email" ON public.student_profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'Students can update their own unlocked profile'
  ) THEN
    CREATE POLICY "Students can update their own unlocked profile" ON public.student_profiles
      FOR UPDATE
      USING (auth.uid() = id AND profile_locked_at IS NULL)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles" ON public.student_profiles
      FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'Admins can insert all profiles'
  ) THEN
    CREATE POLICY "Admins can insert all profiles" ON public.student_profiles
      FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;
