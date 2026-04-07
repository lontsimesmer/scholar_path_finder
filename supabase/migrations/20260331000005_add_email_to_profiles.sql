-- Add email to student_profiles for easier admin management
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update RLS to allow students to update their email
CREATE POLICY "Students can update their own email" ON student_profiles
  FOR UPDATE USING (auth.uid() = id);
