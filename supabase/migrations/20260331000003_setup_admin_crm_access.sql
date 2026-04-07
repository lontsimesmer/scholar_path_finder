-- 1. Create Admins Table
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert your email as the first admin (Example)
INSERT INTO admins (email) VALUES ('toubi.prestation@gmail.com') ON CONFLICT DO NOTHING;

-- 3. Update RLS for student_profiles to allow admins
CREATE POLICY "Admins can view all profiles" ON student_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.email = auth.jwt() ->> 'email')
  );

-- 4. Update RLS for student_applications to allow admins
CREATE POLICY "Admins can view and update all applications" ON student_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.email = auth.jwt() ->> 'email')
  );

-- 5. Update RLS for student_documents to allow admins
CREATE POLICY "Admins can view and update all documents" ON student_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.email = auth.jwt() ->> 'email')
  );

-- 6. Storage access for admins
CREATE POLICY "Admins can view all documents in storage"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'student-documents' AND 
  EXISTS (SELECT 1 FROM admins WHERE admins.email = auth.jwt() ->> 'email')
);
