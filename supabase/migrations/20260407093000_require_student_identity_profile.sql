ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

UPDATE public.student_profiles
SET
  first_name = COALESCE(NULLIF(btrim(first_name), ''), NULLIF(split_part(btrim(full_name), ' ', 1), '')),
  last_name = COALESCE(
    NULLIF(btrim(last_name), ''),
    NULLIF(btrim(substring(btrim(full_name) FROM char_length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
  ),
  updated_at = timezone('utc'::text, now())
WHERE full_name IS NOT NULL
  AND btrim(full_name) <> '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'Students can insert their own profile'
  ) THEN
    CREATE POLICY "Students can insert their own profile" ON public.student_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
